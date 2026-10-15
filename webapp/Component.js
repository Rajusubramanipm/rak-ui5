sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/Device",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "rak/services/model/models"
], function (UIComponent, Device, JSONModel, Filter, FilterOperator, models) {
    "use strict";

    return UIComponent.extend("rak.services.Component", {

        metadata: {
            manifest: "json"
        },

        init: function () {
            UIComponent.prototype.init.apply(this, arguments);

            this.setModel(models.createDeviceModel(), "device");

            /*
             * AppState structure
             * - Flat ZP02 fields preserved so existing ZP02 bindings keep working.
             * - zp03.modify holds the Modify Infrastructure NOC journey state.
             * - activeService tracks which service journey is in progress.
             * Nesting ZP02 under /zp02 is deferred to avoid breaking current views.
             */
            this.setModel(new JSONModel({
                activeService: null,

                // --- ZP02 New Building Permit (flat — do not rename without view migration) ---
                selectedProject: null,
                applicant: {
                    name: "Ahmad Al-Rashidi"
                },
                step2: null,
                step3: {
                    buildings: [],
                    fences: []
                },
                step4: {
                    engineers: [],
                    contractor: null,
                    eweConsultant: null,
                    eweSameAsApplicant: false
                },
                step5: null,
                step6: null,
                step7: {
                    selectedPaymentMethod: null,
                    paymentStatus: "IDLE"
                },
                step8: {
                    requestId: null,
                    buildingIds: [],
                    fenceIds: [],
                    generatedAt: null
                },
                step9: {
                    groups: {
                        drawings:   { comment: "", files: [], status: "DRAFT" },
                        barjeel:    { comment: "", files: [], status: "DRAFT" },
                        structural: { comment: "", files: [], status: "DRAFT" }
                    }
                },

                // --- ZP03 Infrastructure NOC ---
                zp03: {
                    modify: {
                        selectedNoc: null,
                        details: null,
                        draft: null,
                        workLocation: null,
                        attachments: null,
                        review: null,
                        confirmation: null,
                        paymentRequired: false,
                        payment: null
                    }
                }
            }), "appState");

            // Logged-in user, shared by the header of every step ({loginUser>/englishFullName})
            this.setModel(new JSONModel({ englishFullName: "" }), "loginUser");
            this._loadLoginUser();

            this.getRouter().initialize();
        },

        /**
         * Reads the logged-in user's name once from ZEGA_BP_SRV /BusinessPartnerSet
         * and exposes it through the "loginUser" model.
         */
        _loadLoginUser: function () {
            var oModel = this.getModel("ZEGA_BP");
            var oUserModel = this.getModel("loginUser");
            if (!oModel) {
                return;
            }
            oModel.read("/BusinessPartnerSet", {
                filters: [
                    new Filter("EId", FilterOperator.EQ, "784-1990-7294703-1")
                ],
                success: function (oData) {
                    var oBp = (oData.results || [])[0];
                    oUserModel.setProperty("/englishFullName", oBp ? oBp.EnglishFullName : "");
                },
                error: function () {
                    sap.m.MessageToast.show("Read failed");
                }
            });
        },

        destroy: function () {
            UIComponent.prototype.destroy.apply(this, arguments);
        },

        getContentDensityClass: function () {
            if (!this._sContentDensityClass) {
                if (Device.support.touch) {
                    this._sContentDensityClass = "sapUiSizeCozy";
                } else {
                    this._sContentDensityClass = "sapUiSizeCompact";
                }
            }
            return this._sContentDensityClass;
        }

    });
});
