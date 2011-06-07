(function() {
    $('#navigation .count, #navtabs .count').each(function() {
        var $this = $(this);
        var number = $this.text().slice(1, -1);
        var $newcount = $('<span>');
        $newcount.addClass('newcount');
        $newcount.text(number);
        $this.after($newcount);
    });
})();
