sap.ui.define([], function () {
    "use strict";

    var INITIAL_FEES = [
        { feeId: "FEE-001", description: "Application Fee",          amount: 70.00  },
        { feeId: "FEE-002", description: "Municipality Review Fee",  amount: 100.00 },
        { feeId: "FEE-003", description: "Building Inspection Fee",  amount: 100.00 }
    ];

    var ESTIMATED_FEES = [
        { feeId: "EST-001", description: "Construction Supervision Fee", amount: 500.00 },
        { feeId: "EST-002", description: "Infrastructure Development Fee", amount: 250.00 }
    ];

    var PAYMENT_METHODS = [
        { key: "RAK_AE",  label: "RAK.ae / quick payment" },
        { key: "M_RAK",   label: "mRak"                   },
        { key: "KIOSK",   label: "KISOK machine"           },
        { key: "WALK_IN", label: "Walk-in"                 }
    ];

    var ACCOUNT_DETAILS = {
        number:     "1234565439",
        caseNumber: "987654321"
    };

    return {
        getInitialFees:        function () { return INITIAL_FEES.slice();   },
        getEstimatedFinalFees: function () { return ESTIMATED_FEES.slice(); },
        getPaymentMethods:     function () { return PAYMENT_METHODS.slice(); },
        getAccountDetails:     function () { return jQuery.extend({}, ACCOUNT_DETAILS); },

        simulatePayment: function (sMethod, oOptions) {
            var bForceFailure = !!(oOptions && oOptions.simulateFailure);
            return { success: !bForceFailure, method: sMethod };
        }
    };
});
