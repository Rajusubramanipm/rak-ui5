sap.ui.define([], function () {
    "use strict";

    /**
     * Shared attachment UI helpers only.
     * Do NOT place ZP02/ZP03 attachment matrices or max-size business rules here.
     */
    return {
        formatFileSize: function (iBytes) {
            if (!iBytes && iBytes !== 0) {
                return "";
            }
            if (iBytes < 1024) {
                return iBytes + " B";
            }
            if (iBytes < 1024 * 1024) {
                return (iBytes / 1024).toFixed(1) + " KB";
            }
            return (iBytes / (1024 * 1024)).toFixed(1) + " MB";
        },

        getFileExtension: function (sFileName) {
            if (!sFileName || sFileName.indexOf(".") < 0) {
                return "";
            }
            return sFileName.split(".").pop().toLowerCase();
        }
    };
});
