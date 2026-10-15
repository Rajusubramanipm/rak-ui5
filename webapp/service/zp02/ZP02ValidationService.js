sap.ui.define([], function () {
    "use strict";

    /**
     * ZP02 validation rules shell.
     * Existing controllers still contain step validation; migrate gradually here.
     */
    return {
        validateProjectSelection: function (oSelectedProject) {
            return {
                valid: !!oSelectedProject,
                messageKey: oSelectedProject ? null : "step1SelectionRequired"
            };
        }
    };
});
