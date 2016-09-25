$(document).ready(function(){

    (function(){
        var trCache, $table = $('#legend-modal>.modal-content>table');

        $.settings.colorList.ruler10.forEach(function(d, i){
            var string = '<td><span style="background: '+d+';"></span>第 '+(i+1)+' 层</td>';
            var $td = $(string);
            if(i%2 === 0){
                var $tr = $('<tr></tr>');
                $tr.append($td);
                trCache = $tr;
            }
            else{
                trCache.append($td);
                $table.append(trCache);
            }
        });

        $('#open-legend').on('click', function(){
            $('#sidenav-overlay').trigger('click');
            $('#legend-modal').openModal();
        });
    })();

    

});