sap.ui.define([], function () {
    "use strict";

    /**
     * Shared payment UI helpers only.
     * Do NOT place ZP02/ZP03 fee calculation or payment business rules here.
     */
    return {
        formatCurrencyAed: function (nAmount) {
            var n = Number(nAmount);
            if (isNaN(n)) {
                return "";
            }
            return "AED " + n.toFixed(2);
        }
    };
});
