sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageToast",
	"sap/m/MessageBox",
	"sap/ui/core/Fragment",
	"rak/services/service/zp02/ProjectService",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator"
], function (Controller, JSONModel, MessageToast, MessageBox, Fragment, ProjectService, Filter, FilterOperator) {
	"use strict";

	var PAGE_SIZE = 8;

	var STEP_LABELS = [
		"Select Project",
		"Permit Information",
		"Fences & Buildings",
		"Business Partners",
		"Attachments",
		"Summary"
	];

	// ISO date → "Dec 10, 2023"
	function formatDate(sISO) {
		if (!sISO) {
			return "";
		}
		var d = new Date(sISO + "T00:00:00");
		return d.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric"
		});
	}

	return Controller.extend("rak.services.controller.zp02.step1.ProjectSelection", {

		onInit: function () {
			var oViewModel = new JSONModel({
				selectedProjectId: null,
				activeStep: 1,
				stepLabels: STEP_LABELS,
				currentPage: 1,
				totalPages: 1,
				totalCount: 153,
				resultCount: 32,
				isDirty: false,
				busy: false,
				filters: {
					role: "",
					status: "",
					date: "",
					search: ""
				},
				roleOptions: [],
				statusOptions: [],
				dateOptions: [{
					key: "",
					text: "Creation Date"
				}, {
					key: "LW",
					text: "Last Week"
				}, {
					key: "LM",
					text: "Last Month"
				}, {
					key: "P3M",
					text: "Past 3 Months"
				}, {
					key: "ALL",
					text: "All"
				}],
				paginationPages: [],
				displayedProjects: [],
				allProjects: []
			});

			this.getView().setModel(oViewModel, "view");

			this.getOwnerComponent().getRouter()
				.getRoute("zp02-project-selection")
				.attachPatternMatched(this._onRouteMatched, this);
		},

		_onRouteMatched: function () {
			this._loadData();
		},

		_readProjectSet: function () {
			// The ODataModel is the default (unnamed) model declared in manifest.json
			var oODataModel = this.getOwnerComponent().getModel();

			return new Promise(function (resolve, reject) {
				if (!oODataModel) {
					reject(new Error("OData model not available"));
					return;
				}
				oODataModel.read("/projectSet", {
					filters: [
						new Filter("permitApplicant", FilterOperator.EQ, "3000016784")
					],
					urlParameters: {
						"$expand": "toProjBp,toProjBuild,toActiProj"
					},
					success: function (oData) {
						resolve((oData.results || []).map(function (p) {
							return {
								projectId: p.projectId || "",
								projectNumber: p.projectId || "",
								projectCaseId: p.projectCaseId || "",
								parcelId: p.parcelId || "",
								buildings: ((p.toProjBuild && p.toProjBuild.results) || []).map(function (b) {
									var fnNum = function (v) {
										var t = String(v === null || v === undefined ? "" : v).trim();
										var n = Number(t);
										return (t === "" || isNaN(n)) ? t : String(n);
									};
									return {
										id: b.buildingId || "",
										name: b.buildingName || "",
										type: b.buildingType || "",
										area: fnNum(b.area),
										floors: fnNum(b.noFloors)
									};
								}),
								activeProjects: ((p.toActiProj && p.toActiProj.results) || []).map(function (a) {
									var fnNum = function (v) {
										var t = String(v === null || v === undefined ? "" : v).trim();
										var n = Number(t);
										return (t === "" || isNaN(n)) ? t : String(n);
									};
									return {
										projectId: a.projectId || "",
										owner: a.projectOwner || p.projectOwnerName || "",
										parcelId: a.parcelId || "",
										archObjects: fnNum(a.archObjects),
										permits: fnNum(a.permits)
									};
								}),
								businessPartners: ((p.toProjBp && p.toProjBp.results) || []).map(function (bp) {
									return {
										role: bp.role || "",
										bpNumber: bp.bpNumber || "",
										nameEn: bp.nameEn || "",
										nameAr: bp.nameAr || ""
									};
								}),
								ownerName: p.projectOwnerName || "",
								applicant: p.permitApplicant || "",
								address: p.parcelAddress,
								// Not exposed by projectSet yet - safe defaults so filters don't break
								roleCode: "",
								createdOn: "",
								statusCode: "",
								statusText: "",
								isBlocked: false,
								selectable: true
							};
						}));
					},
					error: function (oError) {
						reject(new Error((oError && oError.message) || "projectSet read failed"));
					}
				});
			});
		},

		_loadData: function () {
			var oModel = this.getView().getModel("view");
			var that = this;

			// Show busy indicator until all data has loaded
			oModel.setProperty("/busy", true);

			// Try OData first; fall back to mock data if the backend call fails
			var pProjects = this._readProjectSet().then(function (aData) {
				that._bMock = false;
				return aData;
			}).catch(function (err) {
				jQuery.sap.log.error("projectSet read failed, using mock data: " + err.message);
				that._bMock = true;
				return ProjectService.getProjects();
			});

			Promise.all([
				//ProjectService.getProjects(),
				pProjects,
				ProjectService.getFilterOptions(),
				ProjectService.getProjectMetadata()
			]).then(function (results) {
				var aAll = results[0];
				var oOpts = results[1];
				var oMeta = results[2] || {};
				oModel.setProperty("/allProjects", aAll);
				oModel.setProperty("/totalCount", that._bMock ? (oMeta.totalCount || 153) : aAll.length);
				oModel.setProperty("/statusOptions", oOpts.statusOptions);
				oModel.setProperty("/roleOptions", oOpts.roleOptions);

				// Auto-select first project to match Figma mockup
				if (aAll && aAll.length > 0 && !oModel.getProperty("/selectedProjectId")) {
					oModel.setProperty("/selectedProjectId", aAll[0].projectId);
				}

				this._applyFilters();
			}.bind(this)).catch(function (err) {
				MessageToast.show("Error loading projects: " + err.message);
			}).finally(function () {
				oModel.setProperty("/busy", false);
			});
		},

		_applyFilters: function () {
			var oModel = this.getView().getModel("view");
			var oFilters = oModel.getProperty("/filters");
			var aAll = oModel.getProperty("/allProjects");
			var aFiltered = ProjectService.filterProjects(aAll, oFilters);
			var iTotal = aFiltered.length;
			var iPage = oModel.getProperty("/currentPage");
			var iMaxPage = Math.max(1, Math.ceil(iTotal / PAGE_SIZE));

			if (iPage > iMaxPage) {
				iPage = 1;
				oModel.setProperty("/currentPage", 1);
			}

			var aPage = ProjectService.paginatePage(aFiltered, iPage, PAGE_SIZE).map(function (p) {
				return Object.assign({}, p, {
					createdOnDisplay: formatDate(p.createdOn)
				});
			});

			// Match Figma count when no filters active: "32 of 153 Projects found"
			var bNoFilter = this._bMock && !oFilters.role && !oFilters.status && !oFilters.date && !oFilters.search;
			var iDisplayCount = bNoFilter ? 32 : iTotal;
			var iTotalCount = bNoFilter ? 153 : aAll.length;

			oModel.setProperty("/resultCount", iDisplayCount);
			oModel.setProperty("/totalCount", iTotalCount);
			oModel.setProperty("/totalPages", iMaxPage);
			oModel.setProperty("/displayedProjects", aPage);
			oModel.setProperty("/paginationPages", this._buildPaginationPages(iPage, iMaxPage));

			// Clear selection when page changes and selected project not on current page
			var sSelected = oModel.getProperty("/selectedProjectId");
			if (sSelected) {
				var bOnPage = aPage.some(function (p) {
					return p.projectId === sSelected;
				});
				if (!bOnPage) {
					oModel.setProperty("/selectedProjectId", null);
					this._clearCardSelection();
				}
			}
		},

		onListUpdateFinished: function () {
			var oModel = this.getView().getModel("view");
			var sSelected = oModel.getProperty("/selectedProjectId");
			var oList = this.byId("projectList");
			if (!oList) {
				return;
			}
			var aItems = oList.getItems();
			aItems.forEach(function (oItem) {
				var oCtx = oItem.getBindingContext("view");
				if (oCtx && oCtx.getProperty("projectId") === sSelected) {
					oItem.addStyleClass("rakCardSelected");
				} else {
					oItem.removeStyleClass("rakCardSelected");
				}
			});
		},

		_buildPaginationPages: function (iPage, iMaxPage) {
			var aPages = [];
			for (var i = 1; i <= iMaxPage; i++) {
				aPages.push({
					num: i,
					active: i === iPage
				});
			}
			return aPages;
		},

		/* ── Filter handlers ────────────────────────────────────────── */

		onFilterChange: function () {
			var oModel = this.getView().getModel("view");
			oModel.setProperty("/filters/role", this.byId("selRole") ? this.byId("selRole").getSelectedKey() : "");
			oModel.setProperty("/filters/status", this.byId("selStatus") ? this.byId("selStatus").getSelectedKey() : "");
			oModel.setProperty("/filters/date", this.byId("selDate") ? this.byId("selDate").getSelectedKey() : "");
			oModel.setProperty("/currentPage", 1);
			this._applyFilters();
		},

		onSearch: function (oEvent) {
			var oModel = this.getView().getModel("view");
			oModel.setProperty("/filters/search", oEvent.getParameter("query") || "");
			oModel.setProperty("/currentPage", 1);
			this._applyFilters();
		},

		onSearchLiveChange: function (oEvent) {
			var oModel = this.getView().getModel("view");
			oModel.setProperty("/filters/search", oEvent.getParameter("newValue") || "");
			oModel.setProperty("/currentPage", 1);
			this._applyFilters();
		},

		/* ── Card press ─────────────────────────────────────────────── */

		onCardPress: function (oEvent) {
			var oSource = oEvent.getSource();
			var oCtx = oSource.getBindingContext("view");
			if (!oCtx) {
				return;
			}
			var oProject = oCtx.getObject();
			if (!oProject) {
				return;
			}

			// MSG-C09: Blocked parcel
			if (oProject.isBlocked) {
				var oBundle = this.getView().getModel("i18n").getResourceBundle();
				MessageBox.error(oBundle.getText("msgC09BlockedParcel"), {
					title: oBundle.getText("msgC09BlockedParcelTitle")
				});
				return;
			}

			var oModel = this.getView().getModel("view");
			var sCurrent = oModel.getProperty("/selectedProjectId");
			this._clearCardSelection();

			if (sCurrent === oProject.projectId) {
				oModel.setProperty("/selectedProjectId", null);
			} else {
				oModel.setProperty("/selectedProjectId", oProject.projectId);
				oSource.addStyleClass("rakCardSelected");
				if (oSource.getDomRef()) {
					oSource.getDomRef().blur();
				}
				oModel.setProperty("/isDirty", true);
			}
		},

		_clearCardSelection: function () {
			var oList = this.byId("projectList");
			if (oList) {
				oList.getItems().forEach(function (item) {
					item.removeStyleClass("rakCardSelected");
				});
			}
		},

		/* ── Full Details ───────────────────────────────────────────── */

		onFullDetails: function (oEvent) {
			oEvent.stopPropagation && oEvent.stopPropagation();
			var oView = this.getView();

			// Find the project data from the binding context (walk up to the list item)
			var oSource = oEvent.getSource();
			var oCtx = oSource.getBindingContext("view");
			var oParent = oSource;
			while (!oCtx && oParent) {
				oParent = oParent.getParent ? oParent.getParent() : null;
				if (oParent) {
					oCtx = oParent.getBindingContext("view");
				}
			}
			var oProject = oCtx ? oCtx.getObject() : null;
			if (!oProject) {
				return;
			}

			// Format date for display
			var oData = Object.assign({}, oProject);
			oData.createdOnFormatted = (function (sISO) {
				if (!sISO) {
					return "";
				}
				var d = new Date(sISO + "T00:00:00");
				return d.toLocaleDateString("en-US", {
					month: "short",
					day: "numeric",
					year: "numeric"
				});
			}(oData.createdOn));

			var oSelf = this;
			oData.land = this._emptyLand();
			oData.landBusy = false;
			oData.buildingsHtml = this._buildBuildingsHtml(oProject.buildings || [], false);
			oData.generalHtml = this._buildGeneralHtml(oProject.activeProjects || []);
			oData.bpsHtml = this._buildBusinessPartnersHtml(oProject.businessPartners || []);

			if (!this._oFullDetailsDlg) {
				Fragment.load({
					id: oView.getId(),
					name: "rak.services.fragment.zp02.FullDetails",
					controller: this
				}).then(function (oDlg) {
					oSelf._oFullDetailsDlg = oDlg;
					oView.addDependent(oDlg);
					oDlg.setModel(new JSONModel(oData), "dlgProject");
					oDlg.open();
					oSelf._loadLandDetails(oData.parcelId);
				});
			} else {
				this._oFullDetailsDlg.setModel(new JSONModel(oData), "dlgProject");
				this._oFullDetailsDlg.open();
				this._loadLandDetails(oData.parcelId);
			}
		},

		_escapeHtml: function (v) {
			return String(v === null || v === undefined ? "" : v)
				.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
				.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
		},

		/** Builds the General tab: static Location Information + Active Projects from $expand=toActiProj. */
		_buildGeneralHtml: function (aRows) {
			var esc = this._escapeHtml;
			var sBody = aRows.length ? aRows.map(function (r) {
				return "<tr><td>" + esc(r.projectId) + "</td><td>" + esc(r.owner) + "</td><td>" + esc(r.parcelId) +
					"</td><td>" + esc(r.archObjects) + "</td><td>" + esc(r.permits) + "</td></tr>";
			}).join("") : "<tr><td colspan='5'>No active projects found</td></tr>";
			return "<div class='zp02PD__panel'><div class='zp02PD__section'><h3 class='zp02PD__title'>Location Information</h3><div class='zp02PD__fields zp02PD__fields--3'><div class='zp02PD__field'><span class='zp02PD__label'>Area Name</span><span class='zp02PD__value'>Al Haa, Village</span></div><div class='zp02PD__field'><span class='zp02PD__label'>Plot Area</span><span class='zp02PD__value'>307.80</span></div><div class='zp02PD__field'><span class='zp02PD__label'>Address</span><span class='zp02PD__value'>AL Muntaser Street, 4th Floor, Eastern Kitchen Building, 431</span></div><div class='zp02PD__field'><span class='zp02PD__label'>Community</span><span class='zp02PD__value'>-</span></div><div class='zp02PD__field'><span class='zp02PD__label'>Ownership Type</span><span class='zp02PD__value'>Issuance of Grand Ownership</span></div></div></div>" +
				"<div class='zp02PD__section'><h3 class='zp02PD__title zp02PD__title--tight'>Active Projects</h3>" +
				"<table class='zp02PD__table'><thead><tr><th scope='col'>Project number</th><th scope='col'>Owner</th>" +
				"<th scope='col'>Parcel ID</th><th scope='col'>Arc. Objects</th><th scope='col'>Permits</th></tr></thead><tbody>" +
				sBody + "</tbody></table></div></div>";
		},

		/** Builds the Business Partners tab table from the projectSet $expand=toProjBp result. */
		_buildBusinessPartnersHtml: function (aBps) {
			var esc = this._escapeHtml;
			var bAr = (sap.ui.getCore().getConfiguration().getLanguage() || "").toLowerCase().indexOf("ar") === 0;
			var sBody;
			if (!aBps.length) {
				sBody = "<tr><td colspan='3'>No business partners found</td></tr>";
			} else {
				sBody = aBps.map(function (bp) {
					var sName = bAr ? (bp.nameAr || bp.nameEn) : (bp.nameEn || bp.nameAr);
					return "<tr><td>" + esc(bp.role) + "</td><td>" + esc(bp.bpNumber) + "</td><td>" + esc(sName) + "</td></tr>";
				}).join("");
			}
			return "<div class='zp02PD__panel'><div class='zp02PD__section'><h3 class='zp02PD__title zp02PD__title--tight'>Business Partners Relationships</h3>" +
				"<table class='zp02PD__table'><thead><tr><th scope='col'>Role</th><th scope='col'>BP Number</th><th scope='col'>Name</th></tr></thead><tbody>" +
				sBody + "</tbody></table></div></div>";
		},

		/** Builds the Buildings tab table (same markup/classes as the original static mock). */
		_buildBuildingsHtml: function (aRows, bLoading) {
			var esc = this._escapeHtml;
			var sBody = "";
			if (bLoading) {
				sBody = "<tr><td colspan='5'>Loading...</td></tr>";
			} else if (!aRows.length) {
				sBody = "<tr><td colspan='5'>No buildings found</td></tr>";
			} else {
				sBody = aRows.map(function (r) {
					return "<tr><td>" + esc(r.id) + "</td><td>" + esc(r.name) + "</td><td>" + esc(r.type) +
						"</td><td><span class='zp02PD__small'>" + esc(r.area) + "</span></td><td><span class='zp02PD__small'>" +
						esc(r.floors) + "</span></td></tr>";
				}).join("");
			}
			return "<div class='zp02PD__panel'><table class='zp02PD__table'><thead><tr>" +
				"<th scope='col'>Building ID</th><th scope='col'>Building Name</th><th scope='col'>Building Type</th>" +
				"<th scope='col'>Area (sqm)</th><th scope='col'>No. of Floors</th></tr></thead><tbody>" +
				sBody + "</tbody></table></div>";
		},

		/**
		 * Full Details > Buildings tab <- OData ZEGA_PRM_CASE_SRV /BuildingSet?$filter=Parcel eq '<parcel>'
		 * The BuildingSet Parcel is the project parcel without leading zeros (e.g. '202170028').
		 */
		_loadBuildings: function (sParcelId) {
			var that      = this;
			var oModel    = this.getOwnerComponent().getModel("ZEGA_PRM_CASE");
			var oDlg      = this._oFullDetailsDlg;
			var oDlgModel = oDlg && oDlg.getModel("dlgProject");
			var sParcel   = String(sParcelId || "").replace(/^0+/, "");
			if (!oModel || !oDlgModel || !sParcel) {
				return;
			}
			var oBundle = this.getView().getModel("i18n").getResourceBundle();
			var fnNum = function (v) {
				var n = Number(String(v === null || v === undefined ? "" : v).trim());
				return isNaN(n) ? "" : String(n);
			};

			oDlgModel.setProperty("/buildingsHtml", this._buildBuildingsHtml([], true));
			oModel.read("/BuildingSet", {
				filters: [new Filter("Parcel", FilterOperator.EQ, sParcel)],
				success: function (oData) {
					var aRows = (oData.results || []).map(function (o) {
						return {
							id:     o.BuildingNumber,
							name:   o.BuildingDescription,
							type:   o.BuildingType,
							area:   fnNum(o.BuildingArea),
							floors: fnNum(o.BuildingNoFloors)
						};
					});
					oDlgModel.setProperty("/buildingsHtml", that._buildBuildingsHtml(aRows, false));
				},
				error: function () {
					oDlgModel.setProperty("/buildingsHtml", that._buildBuildingsHtml([], false));
					MessageToast.show(oBundle.getText("step1BuildingsLoadError"));
				}
			});
		},

		_emptyLand: function () {
			return {
				landUsage: "-", landType: "-", parcelStatus: "-", blockNumber: "-",
				builtRatio: "-", maxBuildHeight: "-", gateLevel: "-", demarcation: "-", plotArea: "-"
			};
		},

		/**
		 * Full Details > Land tab <- OData ZEGA_PRJ_PRM_SRV /GetLandDetailSet('<parcelId>')
		 */
		_loadLandDetails: function (sParcelId) {
			var oModel = this.getOwnerComponent().getModel("ZEGA_PRJ");
			var oDlg   = this._oFullDetailsDlg;
			var oDlgModel = oDlg && oDlg.getModel("dlgProject");
			if (!oModel || !oDlgModel || !sParcelId) {
				return;
			}
			var oBundle = this.getView().getModel("i18n").getResourceBundle();
			var fnVal = function (v) {
				var s = (v === null || v === undefined) ? "" : String(v).trim();
				return s || "-";
			};
			var fnNum = function (v) {
				var s = fnVal(v);
				var n = Number(s);
				return (s !== "-" && !isNaN(n)) ? String(n) : s;
			};
			var sPath = oModel.createKey("/GetLandDetailSet", { ParcelID: sParcelId });

			oDlgModel.setProperty("/landBusy", true);
			oModel.read(sPath, {
				success: function (oData) {
					var sDem = (oData.Demarcations || "").trim().toUpperCase();
					oDlgModel.setProperty("/land", {
						landUsage:      fnVal(oData.LandUsage),
						landType:       fnVal(oData.LandType),
						parcelStatus:   fnVal(oData.ParcelStatus),
						blockNumber:    fnVal(oData.BlockNumber),
						builtRatio:     fnVal(oData.BuiltRatio),
						maxBuildHeight: fnNum(oData.MaxBuildHeight),
						gateLevel:      fnNum(oData.GateLevel),
						demarcation:    sDem ? ((sDem === "N" || sDem === "NO") ? "No" : "Yes") : "-",
						plotArea:       fnNum(oData.PlotArea) === "-" ? "-" : fnNum(oData.PlotArea) + " Sqm"
					});
					oDlgModel.setProperty("/landBusy", false);
				},
				error: function () {
					oDlgModel.setProperty("/landBusy", false);
					MessageToast.show(oBundle.getText("step1LandLoadError"));
				}
			});
		},

		onCloseFullDetails: function () {
			if (this._oFullDetailsDlg) {
				this._oFullDetailsDlg.close();
				this._oFullDetailsDlg.destroy();
				this._oFullDetailsDlg = null;
			}
		},

		/* ── Save as Draft — MSG-C03 ────────────────────────────────── */

		onSaveAsDraft: function () {
			var oBundle = this.getView().getModel("i18n").getResourceBundle();
			MessageToast.show(oBundle.getText("msgC03SaveDraftSuccess"));
			this.getView().getModel("view").setProperty("/isDirty", false);
		},

		/* ── Delete — MSG-C01 ───────────────────────────────────────── */

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

		/* ── Next ───────────────────────────────────────────────────── */

		onNext: function () {
			var oViewModel = this.getView().getModel("view");
			var sId = oViewModel.getProperty("/selectedProjectId");
			if (!sId) {
				var oBundle = this.getView().getModel("i18n").getResourceBundle();
				MessageToast.show(oBundle.getText("step1SelectionRequired"));
				return;
			}
			var aAll = oViewModel.getProperty("/allProjects");
			var oProject = aAll.find(function (p) {
				return p.projectId === sId;
			});
			if (oProject) {
				this.getOwnerComponent().getModel("appState").setProperty("/selectedProject", oProject);
			}
			this.getOwnerComponent().getRouter().navTo("zp02-permit-information");
		},

		/* ── Pagination handlers (no global references) ─────────────── */

		onPageFirst: function () {
			this._goToPage(1);
		},

		onPagePrev: function () {
			var iCurrent = this.getView().getModel("view").getProperty("/currentPage");
			if (iCurrent > 1) {
				this._goToPage(iCurrent - 1);
			}
		},

		onPageNext: function () {
			var oModel = this.getView().getModel("view");
			var iCurrent = oModel.getProperty("/currentPage");
			var iMaxPage = oModel.getProperty("/totalPages");
			if (iCurrent < iMaxPage) {
				this._goToPage(iCurrent + 1);
			}
		},

		onPageLast: function () {
			this._goToPage(this.getView().getModel("view").getProperty("/totalPages"));
		},

		onPageNumPress: function (oEvent) {
			var oCtx = oEvent.getSource().getBindingContext("view");
			if (!oCtx) {
				return;
			}
			this._goToPage(oCtx.getProperty("num"));
		},

		_goToPage: function (iPage) {
			var oModel = this.getView().getModel("view");
			oModel.setProperty("/currentPage", iPage);
			this._applyFilters();
		},

		/* ── Formatter ──────────────────────────────────────────────── */

		formatResultCount: function (iResult, iTotal) {
			if (iResult === undefined || iResult === null) {
				return "";
			}
			return iResult + " of " + (iTotal || 0) + " Projects found";
		}

	});
});