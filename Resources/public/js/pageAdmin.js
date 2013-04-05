
var pageAdmin = (function () {

    /*
     * private vars and methods
     */
    var config = {
        previousUrlCheck: null,
        preventSpam: null,
        eventKeyUpTimeout: null,
        urlParentGroup: null,
        urlInputField: null
    };


    var urlChecker = function (url) {

        var paragraphConfig;

        $.ajax({
            url: globalConfig.urlCheckPath,
            type: 'POST',
            data: 'url=' + url,
            success: function (result) {
                if (result.available) {
                    config.urlParentGroup
                        .removeClass('error')
                        .addClass('success');

                    paragraphConfig = {
                        "html": "Url is not in use at the moment",
                        "class": "",
                        "style": "display:inline; margin-left: 40px; color: #007A2F"
                    };

                } else {
                    config.urlParentGroup
                        .removeClass('success')
                        .addClass('error');

                    paragraphConfig = {
                        "html": "Url is already taken by page named '" + result.page + "'",
                        "class": "",
                        "style": "display:inline; margin-left: 40px; color: #BD0000"
                    };
                }

                config.urlInputField
                    .parent()
                        .find('p').remove()
                    .end()
                    .append($('<p/>', paragraphConfig))
                    ;
            }
        });
    }

    var addUrlCheckerListener = function () {
        config.urlInputField
            .keyup(function (event) {
                clearTimeout(config.eventKeyUpTimeout);
                config.eventKeyUpTimeout = setTimeout(function () {
                    var $el = $(event.currentTarget)
                    var url = $el.val();

                    // empty url is not valid at all
                    if (url === '') {
                        config.urlParentGroup
                            .removeClass('success')
                            .addClass('error');
                        return;
                    }

                    // if url is different from previous one checked
                    if (url !== config.previousUrlCheck) {
                        config.previousUrlCheck = url;
                        urlChecker(url);
                    }

                }, 500);
            });
    }


    /*
     * public methods
     */

    return {

        init: function () {

            // TODO: fix following weak selector.
            config.urlParentGroup = $('#tabMeta form.form-horizontal:eq(0) .control-group:eq(3)');
            config.urlInputField = $('#tabMeta form.form-horizontal:eq(0) input[type=text]:eq(2)');

            /*
             * Add listener for url input field
             */
            addUrlCheckerListener();

            this.setupElements();
        },

        /*
         * Setup page elements
         */
        setupElements: function () {

            /*
             * Blocks mouse over
             */
            this.setupMouseover();

            /*
             * Blocks popover to delete
             */
            this.setupPopover();

            /*
             * drag and drop
             */
            this.setupDragDrop();

            /*
             * force modal window size
             */
            this.setupModal();

            $(".raindrop_tips").tooltip();
        },

        removePopover: function (id) {
            $("#block-" + id).find('a.remove-popover').click();
        },

        removeBlock: function (id) {
            $.ajax({
               url: globalConfig.removeBlockPath.replace('0', id),
               type: 'POST',
               success: function (returnData) {
                   if (returnData.result) {
                       $("#block-" + id).find('a.remove-popover').click();
                       $("#block-" + id).remove();
                   }
               }
            });
        },

        setupModal: function () {

            var winWidth = $(window).width() - 80;
            var winHeight = $(window).height() - 200;

            $("body").prepend(
                $("<style/>", {
                    type: "text/css",
                    html:
                        '#tabLayout .modal {' +
                            'width: ' + (winWidth) + 'px;' +
                            'margin-left: -' + (winWidth/2) + 'px;' +
                        '}' +

                        '#tabLayout .modal .modal-body {' +
                            'max-height: ' + winHeight + 'px;' +
                        '}'

                })
            );
        },

        setupMouseover: function () {

            $(".row-fluid.draggable-block:not(.hover-bound)")
                .addClass('hover-bound')
                .mouseenter(function(){
                    $(this).addClass('hover');
                })
                .mouseleave(function(){
                    $(this).removeClass('hover');
                })
                ;

            $(".row-fluid.draggable-source-block")
                .mouseenter(function(){
                    $(this).addClass('hover');
                })
                .mouseleave(function(){
                    $(this).removeClass('hover');
                })
                ;
        },

        setupPopover: function () {
            $(".row-fluid.draggable-block:not(.hover-bound)")
                .addClass('hover-bound')
                .find('.remove-popover')
                    .popover({
                        placement: 'top',
                        html: true
                    })
                .find(".btn-danger")
                    .click(function(){
                        var parentToDelete = $(this)
                            .parents(".row-fluid.draggable-block");

                        $.ajax({
                           url: globalConfig.removeBlockPath.replace('0', parentToDelete.data('id')),
                           type: 'POST',
                           success: function (returnData) {
                               if (returnData.result) {
                                   parentToDelete.remove();
                               }
                           }
                        });
                    })
                .end()
                ;
        },

        setupDragDrop: function () {

            $( ".draggable-source-block" )
                .draggable({
                    cancel: "a.ui-icon", // clicking an icon won't initiate dragging
                    revert: "invalid", // when not dropped, the item will revert back to its initial position
                    containment: "document",
                    helper: "clone",
                    connectWith: ".block-source"
                });

            // let the trash be droppable, accepting the gallery items
            $(".page-layout")
                .sortable({
                    placeholder: "ui-sortable-placeholder",
                    helper: "clone",
                    cursor: "move",
                    distance: 5,
                    stop: function( event, ui ) {

                        var post_data = {
                            ids: []
                        }

                        $(".page-layout .draggable-block")
                            .each(function(){
                                post_data.ids.push($(this).data('id'));
                            });

                        $.ajax({
                            url: globalConfig.orderBlocksPath,
                            type: "POST",
                            data: post_data
                        });
                    }
                });

            $(".page-layout").disableSelection();

            $(".page-layout")
                .droppable({
                    accept: "#tabLayout .draggable-source-block",
                    activeClass: "ui-state-highlight",
                    drop: function( event, ui ) {
                        pageAdmin.addBlockToLayout( ui.draggable );
                    }
                });
        },

        addBlockToLayout: function (draggable) {


            var url = globalConfig.addBlockPath;

            $.ajax({
                url: url.replace('block_type', draggable.data('block')),
                type: 'GET',
                success: function (returnData) {
                    if (returnData.result) {
                        $.ajax({
                            url: globalConfig.reloadBlocksPath,
                            type: 'GET',
                            success: function (returnData) {
                                if (returnData.result) {
                                    $(".page-layout-container")
                                        .html(returnData.result);
                                    pageAdmin.setupElements();
                                }
                            }
                        });
                    }
                }
            })
        }
    };
}());

$(function() {
    pageAdmin.init();
})