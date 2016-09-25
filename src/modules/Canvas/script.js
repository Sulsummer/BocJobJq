$(document).ready(function(){
    $.ixCanvas = function(){
        this.element = {};
        this.itemCache = [];
        this.presentItem = {};
    }

    $.ixCanvas.prototype = {
        init: function(opt){
            var that = this;

            var options = {
                className: '.ix-canvas',
                radius: 15
            }

            options = $.extend({}, options, opt);

            this.options = options;
            this.element = $(options.className);
            return this;
        },
        _http_: function(url, method, data){
            if(!method){
                method = 'get';
            }
            if(!data){
                data = {};
            }
            return $.ajax({
                url: url,
                type: method,
                data: data
            });
        },
        setItemCache: function(urls){
            var that = this;

            var $section = this.element.find('section');
            if($section.length !== urls.length){
                console.log('match error');
                return false;
            }

            urls.forEach(function(d, i){
                that.setItem(d, i, $section[i],
                    function(item, itemCanvasRender, itemLayerRender){
                        that.itemCache.push(item);
                        itemCanvasRender(item);
                        itemLayerRender(item);
                });
            });
        },
        addItem: function(url){
            var that = this;
            var $newSection = $('<section class="canvas-item">'+
                                    '<div class="zoom"></div>'+
                                    '<div class="horizon-zoom"></div>'+
                                    '<div class="vertical-zoom"></div>'+
                                    '<div class="layer"></div>'+
                                '</section>'
                                );
            this.element.push($newSection);
            that.setItem(url, that.itemCache.length, $newSection,
                function(item, itemCanvasRender, itemLayerRender){
                    that.itemCache.push(item);
                    itemCanvasRender(item);
                    itemLayerRender(item);
            });
        },
        setItem: function(url, index, section, initItem){
            var that = this;
            var item = {
                section: section,
                originData: [],
                handledData: [],
                scale: {
                    scrollX: 0,
                    scrollY: 0,
                    zoom: 0
                },
                layer: 1,
                layerSelect: {},
                canvas: {},
                nodeInfo: [],
                nodeInfoPanel: {}
            };

            this._http_(url)
            .done(function(success){
                item.originData = success;
                that._initItemCanvas_(item);
                initItem(item, function(item){
                    item.canvas.render();
                }, function(item){
                    item.layerSelect = $(item.section).find('select');
                    for(var i = 0; i < item.originData[item.originData.length-1].layer; i++){
                        var option = $('<option value="'+(i+1)+'">第 '+(i+1)+' 层</option>');
                        item.layerSelect.append(option);
                    }
                    item.layerSelect.material_select();
                    item.layerSelect.on('change', function(event){
                        item.layer = parseInt(item.layerSelect.val());
                        item.canvas.reRender();
                    });
                });
            })
            .fail(function(error){
                console.log(error);
            })
            return item;
        },
        _initItemCanvas_: function(item){
            var that = this;
            item.canvas = {
                svg: {},
                svgElement: {},
                svgNodes: [],
                svgEdges: [],
                svgTexts: [],
                radius: that.options.radius,
                colorRuler: [],
                lineColor: null,
                force: {},
                dataNodes: [],
                dataEdges: [],
                fixedDelay: 2000,
                _initSvg_: function(){
                    var svg = d3.select(item.section).append("svg")
                                        .attr("width", '100%')
                                        .attr("height", '100%');
                    var svgElement = item.section.querySelector('svg');
                    svgElement.setAttribute('viewBox',
                        0+' '+
                        0+' '+
                        svgElement.clientWidth+' '+
                        svgElement.clientHeight);
                    this.svg = svg;
                    this.svgElement = svgElement;
                    return this;
                },
                _initColor_: function(){
                    this.colorRuler = $.settings.colorList.ruler10;
                    this.lineColor = $.settings.colorList.lineColor;
                    return this;
                },
                render: function(){
                    this._initSvg_()
                        ._initColor_()
                        ._initDataNodeAndEdge_()
                        ._initForce_()
                        ._initSvgNodeAndEdge_()
                        ._resetSvgNodeAndEdgeAndText_()
                        ._setFixed_();
                },
                reRender: function(){
                    this._resetSvgNodeAndEdgeAndText_();
                },
                _initForce_: function(){
                    var _this = this;

                    var force = d3.layout.force()
                                .nodes(_this.dataNodes)
                                .links(_this.dataEdges)
                                .size([$(_this.svgElement).width(),$(_this.svgElement).height()])
                                .linkDistance(100)
                                .linkStrength(1)
                                .charge(-25000)
                                .gravity(1);

                    force.on("tick", function(){ //对于每一个时间间隔
                        //更新连线坐标
                        _this.svgEdges.attr("x1",function(d){ return d.source.x; })
                            .attr("y1",function(d){ return d.source.y; })
                            .attr("x2",function(d){ return d.target.x; })
                            .attr("y2",function(d){ return d.target.y; });
                        _this.svgEdges.attr("d", function(d){
                            return _this._drawLineArrow_(d.source.x, d.source.y, d.target.x, d.target.y);
                        });
                        //更新节点坐标
                        _this.svgNodes.attr("cx",function(d){ return d.x; })
                            .attr("cy",function(d){ return d.y; });

                        // 更新文字坐标
                        _this.svgTexts.attr("x", function(d){ return d.x; })
                           .attr("y", function(d){ return d.y; });

                    });

                    force.start();
                    this.force = force;
                    return this;
                },
                _initDataNodeAndEdge_: function(){
                    var _this = this;

                    var dataNodes = [], dataEdges = [];

                    item.originData.forEach(function(d, i){
                        dataNodes.push({
                            data: d
                        });
                    })

                    dataNodes.forEach(function(d, i){
                        dataEdges = _setEdges_(dataEdges, d.data);
                    });
                    function _setEdges_(edges, data){
                        data.in.forEach(function(d, i){
                            edges.push({
                                source: d.order,
                                target: data.order
                            });
                        });
                        data.out.forEach(function(d, i){
                            edges.push({
                                source: data.order,
                                target: d.order
                            })
                        });
                        return edges;
                    }
                    this.dataNodes = dataNodes;
                    this.dataEdges = dataEdges;
                    return this;
                },
                _initSvgNodeAndEdge_: function(){
                    var _this = this;
                    var svgNodes, svgEdges, svgTexts;

                    var drag = this.force.drag()
                        .on("dragstart", function(d, i){
                            d.fixed = true;
                        });

                    svgEdges = this.svg.selectAll("path")
                            .data(_this.dataEdges)
                            .enter()
                            .append("path")
                            .attr("d", function(d, i){
                                return _this._drawLineArrow_(d.source.x, d.source.y, d.target.x, d.target.y);
                            })
                            .attr("class", function(d, i){
                                return 'path-'+i;
                            })
                            .style("stroke", function(){
                                return _this.lineColor;
                            })
                            .style("stroke-width",1.5);
                    svgNodes = this.svg.selectAll("circle")
                            .data(_this.dataNodes)
                            .enter()
                            .append("circle")
                            .attr("r", function(d, i){
                                var weight = d.data.in.length + d.data.out.length;
                                return _this.radius*(1+weight/5);
                            })
                            .attr("class", function(d, i){
                                return "i-point i-point-" + i;
                            })
                            .style("fill",function(d,i){
                                return _this.colorRuler[d.data.layer-1];
                            })
                            .on('dblclick', function(d, i){
                                if (d3.event.defaultPrevented) return;
                                that._initNodePanel_(item);
                                that._addNodeInfoToPanel(item, d.data);
                            })
                            .on('contextmenu', function(d, i){
                                if (d3.event.defaultPrevented) return;
                                window.event.preventDefault();
                            })
                            .call(drag);
                    svgTexts = this.svg.selectAll("text")
                            .data(_this.dataNodes)
                            .enter()
                            .append("text")
                            .style("fill", "black")
                            .attr("dx", function(d, i){
                                var weight = d.data.in.length + d.data.out.length;
                                return 0-_this.radius*(1+weight/5);
                            })
                            .attr("dy", function(d, i){
                                var weight = d.data.in.length + d.data.out.length;
                                return 0-_this.radius*(1+weight/5)-3;
                            })
                            .text(function(d, i){
                                return d.data.name;
                            });
                    this.svgNodes = svgNodes;
                    this.svgEdges = svgEdges;
                    this.svgTexts = svgTexts;
                    return this;
                },
                _resetSvgNodeAndEdgeAndText_: function(){
                    this.svgNodes.style('display', function(d, i){
                        if(d.data.layer > item.layer){
                            return 'none';
                        }
                    });
                    this.svgTexts.style('display', function(d, i){
                        if(d.data.layer > item.layer){
                            return 'none';
                        }
                    });
                    this.svgEdges.style('display', function(d, i){
                        if(d.source.data.layer > item.layer || d.target.data.layer > item.layer){
                            return 'none';
                        }
                    });
                    return this;
                },
                _setFixed_: function(){
                    var _this = this;
                    setTimeout(function(){
                        _this.svgNodes.each(function(d, i){
                            d.fixed = true;
                        });
                    }, _this.fixedDelay);
                },
                _saveNodeTmpLocation_: function(){

                    return this;
                },
                _drawLineArrow_: function(x1,y1,x2,y2){
                    var path;
                    var slopy,cosy,siny;
                    var Par=10.0;
                    var x3,y3;
                    slopy=Math.atan2((y1-y2),(x1-x2));
                    cosy=Math.cos(slopy);
                    siny=Math.sin(slopy);

                    path="M"+x1+","+y1+" L"+x2+","+y2;

                    x3=(Number(x1)+Number(x2))/2;
                    y3=(Number(y1)+Number(y2))/2;

                    path +=" M"+x3+","+y3;

                    path +=" L"+(Number(x3)+Number(Par*cosy-(Par/2.0*siny)))+","+(Number(y3)+Number(Par*siny+(Par/2.0*cosy)));  

                    path +=" M"+(Number(x3)+Number(Par*cosy+Par/2.0*siny)+","+ (Number(y3)-Number(Par/2.0*cosy-Par*siny)));  
                    path +=" L"+x3+","+y3;


                    return path;
                }
            };
            return item;
        },
        _initNodePanel_: function(item){
            if((!item.nodeInfo.length) || (item.nodeInfoPanel.css('display') === 'block')){
                item.nodeInfoPanel = $($(item.section).find('.node-info-panel'));
                item.nodeInfoPanel.draggable({
                    cursor: 'pointer',
                    handle: 'div.title',
                    scroll: false,
                    containment: ".ix-canvas"
                }).fadeIn(200);
            }
        },
        _addNodeInfoToPanel: function(item, data){
            var index = item.nodeInfo.indexOf(data),
                lis = item.nodeInfoPanel.find('li'),
                ul = $(item.nodeInfoPanel.find('ul'));

            lis.each(function(i, d){
                $(d).find('.collapsible-header').removeClass('active');
            });

            if(index >= 0){
                $(lis[index]).find('.collapsible-header').addClass('active');
                ul.collapsible({
                    accordion: true
                });
                return;
            }
            item.nodeInfo.push(data);
            var li = $('<li>'+
                            '<div class="collapsible-header active"><span></span>'+data.name+'</div>'+
                            '<div class="collapsible-body"></div>'+
                        '</li>');
            var title1 = $('<h5>上游企业</h5>');
            var table1 = $('<table>'+
                                '<thead>'+
                                    '<tr>'+
                                        '<td>企业</td>'+
                                        '<td>交易金额（人民币/万元）</td>'+
                                        '<td>交易次数</td>'+
                                    '</tr>'+
                                '</thead>'+
                                '<tbody>'+
                                '</tbody>'+
                          '</table>');

            var title2 = $('<h5>下游企业</h5>');
            var table2 = $('<table>'+
                                '<thead>'+
                                    '<tr>'+
                                        '<td>企业</td>'+
                                        '<td>交易金额（人民币/万元）</td>'+
                                        '<td>交易次数</td>'+
                                    '</tr>'+
                                '</thead>'+
                                '<tbody>'+
                                '</tbody>'+
                          '</table>');

            data.in.forEach(function(d, i){
                var tr = $('<tr></tr>');
                var td1 = $('<td>'+d.name+'</td>'),
                    td2 = $('<td>'+d.amt+'</td>'),
                    td3 = $('<td>'+d.txnnum+'</td>');
                tr.append(td1).append(td2).append(td3);
                table1.append(tr);

                tr.on('click', function(){

                })
            });
            data.out.forEach(function(d, i){
                var tr = $('<tr></tr>');
                var td1 = $('<td>'+d.name+'</td>'),
                    td2 = $('<td>'+d.amt+'</td>'),
                    td3 = $('<td>'+d.txnnum+'</td>');
                tr.append(td1).append(td2).append(td3);
                table2.append(tr);

                tr.on('click', function(){

                })
            });
            $(li.find('.collapsible-body')).append(title1).append(table1).append(title2).append(table2);
            ul.append(li).collapsible({
                accordion: true
            });
        },
        _addSubNodeInfoToPanel: function(item, data){
            
        }
    }
});