sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageToast",
	"sap/m/MessageBox",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"rak/services/service/zp02/ReferenceDataService",
	"rak/services/service/zp02/PermitService"
], function (Controller, JSONModel, MessageToast, MessageBox, Filter, FilterOperator, ReferenceDataService, PermitService) {
	"use strict";

	var STEP_LABELS = [
		"Select Project",
		"Permit Information",
		"Fences & Buildings",
		"Business Partners",
		"Attachments",
		"Summary"
	];

	function _emptyErrors() {
		return {
			etisalatNocState: "None",
			etisalatNocMsg: "",
			eweNocState: "None",
			eweNocMsg: "",
			civilDefenceState: "None",
			civilDefenceMsg: "",
			grantTypeState: "None",
			grantTypeMsg: "",
			grantExpiryState: "None",
			grantExpiryMsg: ""
		};
	}

	function _emptyForm() {
		return {
			etisalatNocNo: "",
			eweNocNo: "",
			civilDefenceArea: "",
			grantProgramIndex: 1, // default: No
			grantType: "",
			grantExpiryDate: ""
		};
	}

	return Controller.extend("rak.services.controller.zp02.step2.PermitInformation", {

		onInit: function () {
			var oViewModel = new JSONModel({
				activeStep: 2,
				stepLabels: STEP_LABELS,
				project: {
					ownerName: "",
					projectNumber: "",
					address: "",
					projectId: "",
					landSector: null
				},
				showEtisalatNoc: true,
				showGrantFields: false,
				civilDefenceAreas: [],
				civilDefenceAreasBusy: false,
				grantTypes: [],
				grantTypesBusy: false,
				form: _emptyForm(),
				errors: _emptyErrors()
			});

			this.getView().setModel(oViewModel, "view");

			this.getOwnerComponent().getRouter()
				.getRoute("zp02-permit-information")
				.attachPatternMatched(this._onRouteMatched, this);
		},

		_onRouteMatched: function () {
			var oAppState = this.getOwnerComponent().getModel("appState");
			var oProject = oAppState ? oAppState.getProperty("/selectedProject") : null;

			// No project chosen in Step 1 (e.g. page refresh / direct URL) -> go back to Step 1
			if (!oProject) {
				this.getOwnerComponent().getRouter().navTo("zp02-project-selection", {}, true);
				return;
			}

			this._loadContext(oProject);
			this._loadReferenceData();
			setTimeout(function () {
				if (document.activeElement && document.activeElement.blur && document.activeElement.classList.contains("rakPermitAction")) {
					document.activeElement.blur();
				}
			}, 60);
		},

		_loadContext: function (oProject) {
			var oViewModel = this.getView().getModel("view");

			oViewModel.setProperty("/project", {
				ownerName: oProject.ownerName || "",
				projectNumber: oProject.projectNumber || "",
				address: oProject.address || "",
				projectId: oProject.projectId || "",
				landSector: oProject.landSector != null ? oProject.landSector : null
			});

			// Sector 8 or 9 → Etisalat/Du NOC not mandatory — hide field
			var vSector = oProject.landSector;
			var bShow = !(vSector === 8 || vSector === 9 || vSector === "8" || vSector === "9");
			oViewModel.setProperty("/showEtisalatNoc", bShow);

			// Default Grant Program to No (Grant Type & Expiry hidden until "Yes" is chosen)
			oViewModel.setProperty("/form", _emptyForm());
			oViewModel.setProperty("/showGrantFields", false);
			oViewModel.setProperty("/errors", _emptyErrors());
		},

		_loadReferenceData: function () {
			var oViewModel = this.getView().getModel("view");

			this._loadCivilDefenceAreas();
			this._loadGrantTypes();
		},

		/**
		 * Civil Defence Area dropdown <- OData ZMUN_PRJ_PRM_SRV
		 * /civilDefenseSet?$filter=langu eq 'E'  (areaId -> key, areaDesc -> text).
		 * Uses the default (unnamed) model. Falls back to mock data if the call fails.
		 */
		_loadCivilDefenceAreas: function () {
			var oViewModel = this.getView().getModel("view");
			var oModel = this.getOwnerComponent().getModel();
			var oBundle = this.getView().getModel("i18n").getResourceBundle();

			var fnFallback = function () {
				ReferenceDataService.getCivilDefenceAreas().then(function (aAreas) {
					oViewModel.setProperty("/civilDefenceAreas", aAreas);
				}).catch(function (err) {
					MessageToast.show("Error loading reference data: " + err.message);
				});
			};

			if (!oModel || typeof oModel.read !== "function") {
				fnFallback();
				return;
			}

			oViewModel.setProperty("/civilDefenceAreasBusy", true);
			oModel.read("/civilDefenseSet", {
				filters: [new Filter("langu", FilterOperator.EQ, "E")],
				success: function (oData) {
					var aAreas = (oData.results || []).map(function (o) {
						return {
							key: o.areaId,
							text: o.areaDesc
						};
					});
					// keep the leading "Select" placeholder used by the other dropdowns
					aAreas.unshift({
						key: "",
						text: oBundle.getText("step2PlaceholderSelect")
					});
					oViewModel.setProperty("/civilDefenceAreas", aAreas);
					oViewModel.setProperty("/civilDefenceAreasBusy", false);
				},
				error: function () {
					oViewModel.setProperty("/civilDefenceAreasBusy", false);
					MessageToast.show(oBundle.getText("step2CivilDefenceLoadError"));
					fnFallback();
				}
			});
		},

		/**
		 * Grant Type dropdown <- OData ZEGA_PRJ_TOWNPLANNING_SRV /GetGrantTypesSet
		 * (GRT_TYPE -> key, DESCRIPTION -> text). Falls back to mock data if the call fails.
		 */
		_loadGrantTypes: function () {
			var oViewModel = this.getView().getModel("view");
			var oModel = this.getOwnerComponent().getModel("ZEGA_PRJ_TWNPLN");
			var oBundle = this.getView().getModel("i18n").getResourceBundle();

			var fnFallback = function () {
				ReferenceDataService.getGrantTypes().then(function (aTypes) {
					oViewModel.setProperty("/grantTypes", aTypes);
				});
			};

			if (!oModel) {
				fnFallback();
				return;
			}

			oViewModel.setProperty("/grantTypesBusy", true);
			oModel.read("/GetGrantTypesSet", {
				success: function (oData) {
					var aTypes = (oData.results || []).map(function (o) {
						return {
							key: o.GRT_TYPE,
							text: o.DESCRIPTION
						};
					});
					// keep the leading "Select" placeholder used by the other dropdowns
					aTypes.unshift({
						key: "",
						text: oBundle.getText("step2PlaceholderSelect")
					});
					oViewModel.setProperty("/grantTypes", aTypes);
					oViewModel.setProperty("/grantTypesBusy", false);
				},
				error: function () {
					oViewModel.setProperty("/grantTypesBusy", false);
					MessageToast.show(oBundle.getText("step2GrantTypesLoadError"));
					fnFallback();
				}
			});
		},

		/* ── Grant Program toggle ─────────────────────────────────── */

		onGrantProgramChange: function (oEvent) {
			var iIndex = oEvent.getParameter("selectedIndex");
			var bGrant = iIndex === 0;
			var oViewModel = this.getView().getModel("view");
			oViewModel.setProperty("/showGrantFields", bGrant);
			if (!bGrant) {
				oViewModel.setProperty("/form/grantType", "");
				oViewModel.setProperty("/form/grantExpiryDate", "");
				oViewModel.setProperty("/errors/grantTypeState", "None");
				oViewModel.setProperty("/errors/grantTypeMsg", "");
				oViewModel.setProperty("/errors/grantExpiryState", "None");
				oViewModel.setProperty("/errors/grantExpiryMsg", "");
			}
		},

		/* ── Live clear on field change ───────────────────────────── */

		onFieldChange: function () {
			this.getView().getModel("view").setProperty("/errors", _emptyErrors());
		},

		/* ── Validate ─────────────────────────────────────────────── */

		_validate: function () {
			var oViewModel = this.getView().getModel("view");
			var oForm = oViewModel.getProperty("/form");
			var bGrant = oViewModel.getProperty("/showGrantFields");
			var bShowEtis = oViewModel.getProperty("/showEtisalatNoc");
			var oBundle = this.getView().getModel("i18n").getResourceBundle();
			var oErrors = _emptyErrors();
			var bValid = true;

			// MSG-V01: Etisalat/Du NOC required (only for non-sector-8/9 land)
			if (bShowEtis && !(oForm.etisalatNocNo || "").trim()) {
				oErrors.etisalatNocState = "Error";
				oErrors.etisalatNocMsg = oBundle.getText("msgV01EtisalatNocRequired");
				bValid = false;
			}

			// EWE NOC: required (MSG-V02), then format (MSG-V03)
			var sEwe = (oForm.eweNocNo || "").trim();
			if (!sEwe) {
				oErrors.eweNocState = "Error";
				oErrors.eweNocMsg = oBundle.getText("msgV02Required");
				bValid = false;
			} else if (sEwe.length !== 14) {
				oErrors.eweNocState = "Error";
				oErrors.eweNocMsg = oBundle.getText("msgV03EweNocFormat");
				bValid = false;
			}

			// Civil Defence Area is optional

			// Grant program conditional validation
			if (bGrant) {
				// Grant Type required (MSG-V02)
				if (!(oForm.grantType || "").trim()) {
					oErrors.grantTypeState = "Error";
					oErrors.grantTypeMsg = oBundle.getText("msgV02Required");
					bValid = false;
				}

				// Program Expiry Date: required + must not be in the past (MSG-V05)
				var sExpiry = (oForm.grantExpiryDate || "").trim();
				if (!sExpiry) {
					oErrors.grantExpiryState = "Error";
					oErrors.grantExpiryMsg = oBundle.getText("msgV02Required");
					bValid = false;
				} else {
					var dExpiry = new Date(sExpiry + "T00:00:00");
					var dToday = new Date();
					dToday.setHours(0, 0, 0, 0);
					if (isNaN(dExpiry.getTime()) || dExpiry < dToday) {
						oErrors.grantExpiryState = "Error";
						oErrors.grantExpiryMsg = oBundle.getText("msgV05InvalidDate");
						bValid = false;
					}
				}
			}

			oViewModel.setProperty("/errors", oErrors);
			return bValid;
		},

		/* ── Save as Draft — MSG-C03 ──────────────────────────────── */

		onSaveAsDraft: function () {
			var oBundle = this.getView().getModel("i18n").getResourceBundle();
			var oViewModel = this.getView().getModel("view");
			var oProject = oViewModel.getProperty("/project");
			var oForm = oViewModel.getProperty("/form");
			PermitService.saveDraft(Object.assign({
				projectId: oProject.projectId
			}, oForm)).then(function () {
				MessageToast.show(oBundle.getText("msgC03SaveDraftSuccess"));
			});
		},

		/* ── Delete — MSG-C01 ─────────────────────────────────────── */

		onDelete: function () {
			var oBundle = this.getView().getModel("i18n").getResourceBundle();
			MessageBox.confirm(oBundle.getText("msgC01DeleteConfirm"), {
				title: oBundle.getText("msgC01DeleteConfirmTitle"),
				actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
				emphasizedAction: MessageBox.Action.CANCEL,
				onClose: function (sAction) {
					if (sAction === MessageBox.Action.OK) {
						MessageToast.show("Application deleted.");
					}
				}
			});
		},

		/* ── Back: return to Step 1 ───────────────────────────────── */

		onBack: function () {
			this.getOwnerComponent().getRouter().navTo("zp02-project-selection");
		},

		/* ── Next: validate then navigate to Step 3 placeholder ───── */

		onNext: function () {
			if (!this._validate()) {
				return;
			}
			this._saveToAppState();
			this.getOwnerComponent().getRouter().navTo("zp02-fences-buildings");
		},

		_saveToAppState: function () {
			var oViewModel = this.getView().getModel("view");
			var oForm = oViewModel.getProperty("/form");
			var aAreas = oViewModel.getProperty("/civilDefenceAreas") || [];
			var aTypes = oViewModel.getProperty("/grantTypes") || [];

			var oAreaMatch = aAreas.filter(function (a) {
				return a.key === oForm.civilDefenceArea;
			})[0];
			var oTypeMatch = aTypes.filter(function (t) {
				return t.key === oForm.grantType;
			})[0];

			this.getOwnerComponent().getModel("appState").setProperty("/step2", {
				etisalatNocNo: oForm.etisalatNocNo,
				eweNocNo: oForm.eweNocNo,
				civilDefenceArea: oForm.civilDefenceArea,
				civilDefenceAreaText: oAreaMatch ? oAreaMatch.text : oForm.civilDefenceArea,
				grantProgramIndex: oForm.grantProgramIndex,
				showGrantFields: oViewModel.getProperty("/showGrantFields"),
				grantType: oForm.grantType,
				grantTypeText: oTypeMatch ? oTypeMatch.text : oForm.grantType,
				grantExpiryDate: oForm.grantExpiryDate,
				showEtisalatNoc: oViewModel.getProperty("/showEtisalatNoc")
			});
		}

	});
});