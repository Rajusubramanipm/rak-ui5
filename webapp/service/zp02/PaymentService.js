sap.ui.define([
    "rak/services/service/zp02/MockPaymentAdapter"
], function (MockPaymentAdapter) {
    "use strict";

    function _fmt(nAmount) {
        return parseFloat(nAmount || 0).toFixed(2);
    }

    function _enrichFees(aRaw) {
        return aRaw.map(function (f) {
            return {
                feeId:       f.feeId,
                description: f.description,
                amount:      _fmt(f.amount),
                amountRaw:   f.amount
            };
        });
    }

    function _sumFees(aFees) {
        var nTotal = aFees.reduce(function (acc, f) {
            return acc + (parseFloat(f.amountRaw !== undefined ? f.amountRaw : f.amount) || 0);
        }, 0);
        return _fmt(nTotal);
    }

    return {
        getInitialFees: function () {
            return _enrichFees(MockPaymentAdapter.getInitialFees());
        },

        getEstimatedFinalFees: function () {
            return _enrichFees(MockPaymentAdapter.getEstimatedFinalFees());
        },

        getPaymentMethods: function () {
            return MockPaymentAdapter.getPaymentMethods();
        },

        getAccountDetails: function () {
            return MockPaymentAdapter.getAccountDetails();
        },

        calculateInitialTotal: function (aFees) {
            return _sumFees(aFees);
        },

        calculateEstimatedTotal: function (aFees) {
            return _sumFees(aFees);
        },

        simulatePayment: function (sMethod, oOptions) {
            return MockPaymentAdapter.simulatePayment(sMethod, oOptions);
        }
    };
});
