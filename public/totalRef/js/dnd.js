var dnd = (function () {

    self = {}
    self.init = function () {
        window.startPos = window.endPos = {};

        //makeDraggable();

        $('.drophere').droppable({
            hoverClass: 'hoverClass',
            drop: function (event, ui) {
                var $from = $(ui.draggable),
                    $fromParent = $from.parent(),
                    $to = $(this).children(),
                    $toParent = $(this);

                window.endPos = $to.offset();

            /*    swap($from, $from.offset(), window.endPos, 0);
                swap($to, window.endPos, window.startPos, 1000, function () {
                    $toParent.html($from.css({position: 'relative', left: '', top: '', 'z-index': ''}));
                    $fromParent.html($to.css({position: 'relative', left: '', top: '', 'z-index': ''}));
                    self.makeDraggable();
                });
                function swap($el, fromPos, toPos, duration, callback) {
                    $el.css('position', 'absolute')
                        .css(fromPos)
                        .animate(toPos, duration, function () {
                            if (callback) callback();
                        });
                }*/

            }

        });




    }

   self.makeDraggable=function(div) {
        $(".draghere").draggable({
            zIndex: 99999,
            revert: 'invalid',
            start: function (event, ui) {
                window.startPos = $(this).offset();
            }
        });
    }


    return self;
})();