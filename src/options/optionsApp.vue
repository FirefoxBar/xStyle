<template>
	<div class="main">
		<md-tabs class="md-primary main-menu" md-elevation="1" md-active-tab="tab-style-list">
			<md-tab id="tab-style-list" :md-label="t('styles')">
				<md-menu class="sort-menu-button" md-size="medium" md-align-trigger>
					<md-button class="with-icon" md-menu-trigger><md-icon class="iconfont icon-sort"></md-icon>{{t('sortStyles')}}</md-button>
					<md-menu-content class="sort-menu">
						<md-menu-item :class="{ active: sort == 'id' }" @click="sort = 'id'">{{t('sortStylesById')}}</md-menu-item>
						<md-menu-item :class="{ active: sort == 'status' }" @click="sort = 'status'">{{t('sortStylesByStatus')}}</md-menu-item>
						<md-menu-item :class="{ active: sort == 'name' }" @click="sort = 'name'">{{t('sortStylesByName')}}</md-menu-item>
						<md-menu-item :class="{ active: sort == 'modified' }" @click="sort = 'modified'">{{t('sortStylesByModified')}}</md-menu-item>
					</md-menu-content>
				</md-menu>
				<md-button id="update-all-styles" class="with-icon"><md-icon class="iconfont icon-refresh"></md-icon>{{t('updateAllStyles')}}</md-button>
				<md-button href="edit.html" class="with-icon"><md-icon class="iconfont icon-add"></md-icon>{{t('addStyleLabel')}}</md-button>
				<md-button id="install-from-file" class="with-icon"><md-icon class="iconfont icon-create-new-folder"></md-icon>{{t('installFromFile')}}</md-button>
				<div class="md-layout md-gutter">
					<div class="md-layout-item md-size-50 md-small-size-100 style-item" v-for="s of sortedStyles" :key="s.id">
						<md-card>
							<md-card-area>
								<md-card-header>
									<div class="md-title">
										<span>{{s.name}}</span>
										<md-switch v-model="s.enabled" class="md-primary" :data-id="s.id" @change="newValue => onStyleEnable(s.id, newValue)"></md-switch>
									</div>
								</md-card-header>
								<md-card-content>
									<p>Last modified at {{timestampToString(s.lastModified)}}</p>
									<p><md-checkbox v-model="s.autoUpdate" class="md-primary" :disabled="!s.updateUrl" @change="newValue => onStyleAutoUpdate(s.id, newValue)">{{t('autoUpdateLabel')}}</md-checkbox></p>
								</md-card-content>
								<md-card-actions md-alignment="left">
									<md-button class="md-primary" :href="`edit.html?id=${s.id}`">{{t('editStyleLabel')}}</md-button>
									<md-button class="md-primary" @click="onStyleDelete(s)">{{t('deleteStyleLabel')}}</md-button>
									<md-button class="md-primary" @click="onStyleExport(s)">{{t('export')}}</md-button>
									<md-button class="md-primary">{{t('advancedTitle')}}</md-button>
									<md-button class="md-primary">{{t('updateOneStyle')}}</md-button>
								</md-card-actions>
							</md-card-area>
						</md-card>
					</div>
				</div>
			</md-tab>
			<md-tab id="tab-options" :md-label="t('optionsHeading')">
				<md-card>
					<md-card-header>
						<div class="md-title">{{t('optionsHeading')}}</div>
					</md-card-header>
					<md-card-content>
						<div class="md-layout md-gutter">
							<div class="md-layout-item md-size-50"><md-checkbox v-model="options.showBadge">{{t('prefShowBadge')}}</md-checkbox></div>
							<div class="md-layout-item md-size-50"><md-checkbox v-model="options.modifyCSP">{{t('modifyCSP')}}</md-checkbox></div>
							<div class="md-layout-item md-size-50"><md-checkbox v-model="options.autoUpdate">{{t('autoUpdateStyles')}}</md-checkbox></div>
							<div class="md-layout-item md-size-50"><md-checkbox v-model="options.compactPopup">{{t('displayCompactPopup')}}</md-checkbox></div>
							<div class="md-layout-item md-size-50"><md-checkbox v-model="options.onlyHtml">{{t('onlyAppliesToHTML')}}</md-checkbox></div>
						</div>
					</md-card-content>
				</md-card>
			</md-tab>
			<md-tab id="tab-backup" :md-label="t('exportAndImport')">
				<md-button class="with-icon" @click="onExport"><md-icon class="iconfont icon-save"></md-icon>{{t('bckpInstStyles')}}</md-button>
				<md-button class="with-icon" @click="onImport"><md-icon class="iconfont icon-folder-open"></md-icon>{{t('retrieveBckp')}}</md-button>
				<md-button class="with-icon"><md-icon class="iconfont icon-firefox"></md-icon>{{t('importFromFirefoxStylish')}}</md-button>
				<md-card>
					<md-card-header>
						<div class="md-title">{{t('cloudTitle')}}</div>
					</md-card-header>
					<md-card-content>
						<div class="cloud-from">
							<md-radio class="md-primary" v-model="cloud.from" value="onedrive">OneDrive</md-radio>
							<md-radio class="md-primary" v-model="cloud.from" value="google">Google Drive</md-radio>
						</div>
						<md-table class="class-table">
							<md-table-row>
								<md-table-head class="cell-name">{{t('cloudFileName')}}</md-table-head>
								<md-table-head class="cell-size">{{t('cloudFileSize')}}</md-table-head>
								<md-table-head class="cell-action">{{t('cloudFileAction')}}</md-table-head>
							</md-table-row>
							<md-table-row v-show="cloud.list.length === 0">
								<md-table-cell colspan="3">
									<md-button class="md-raised" @click="cloudLoadList">{{t('cloudLoadList')}}</md-button>
								</md-table-cell>
							</md-table-row>
							<md-table-row v-for="f of cloud.list" :key="f.id">
								<md-table-cell>{{f.name}}</md-table-cell>
								<md-table-cell>{{f.size}}</md-table-cell>
								<md-table-cell>
									<md-button class="md-primary"><span>{{t('cloudImport')}}</span></md-button>
									<md-button class="md-primary"><span>{{t('cloudDelete')}}</span></md-button>
								</md-table-cell>
							</md-table-row>
							<md-table-row v-show="cloud.list.length > 0">
								<md-table-cell colspan="3">
									<md-button class="md-raised">{{t('cloudExport')}}</md-button>
									<md-button class="md-raised">{{t('cloudReload')}}</md-button>
								</md-table-cell>
							</md-table-row>
						</md-table>
					</md-card-content>
				</md-card>
			</md-tab>
		</md-tabs>
		<md-dialog :md-active.sync="exportDialog.show">
			<md-dialog-title>{{t('export')}}</md-dialog-title>
			<md-dialog-content>
				<div class="md-layout md-gutter">
					<div class="md-layout-item md-size-50 md-small-size-100">
						<md-field>
							<label>{{t('styleName')}}</label>
							<md-input v-model="exportDialog.name" disabled></md-input>
						</md-field>
					</div>
					<div class="md-layout-item md-size-50 md-small-size-100">
						<md-field>
							<label>{{t('styleAuthor')}}</label>
							<md-input v-model="exportDialog.author"></md-input>
						</md-field>
					</div>
					<div class="md-layout-item md-size-50 md-small-size-100">
						<md-field>
							<label>URL</label>
							<md-input v-model="exportDialog.url"></md-input>
						</md-field>
					</div>
					<div class="md-layout-item md-size-50 md-small-size-100">
						<md-field>
							<label>Update URL</label>
							<md-input v-model="exportDialog.updateUrl"></md-input>
						</md-field>
					</div>
					<div class="md-layout-item md-size-50 md-small-size-100">
						<md-field>
							<label>MD5 URL</label>
							<md-input v-model="exportDialog.md5Url"></md-input>
						</md-field>
					</div>
					<div class="md-layout-item md-size-50 md-small-size-100">
						<md-field>
							<label>Original MD5</label>
							<md-input v-model="exportDialog.originalMd5"></md-input>
						</md-field>
					</div>
					<div class="md-layout-item md-size-100">{{t('exportHelp')}}</div>
				</div>
			</md-dialog-content>
			<md-dialog-actions>
				<md-button class="md-primary" @click="onExportToJson">{{t('exportAs', 'json')}}</md-button>
				<md-button class="md-primary" @click="onExportToUserCss">{{t('exportAs', 'user.' + exportDialog.format)}}</md-button>
				<md-button class="md-primary" @click="exportDialog.show = false">Close</md-button>
			</md-dialog-actions>
		</md-dialog>
	</div>
</template>

<script>
import browser from 'webextension-polyfill';
import dateFormat from 'dateformat';
import merge from 'merge';
import md5 from 'md5.js';
import utils from '../core/utils';
import file from '../core/file';
import styles from '../core/styles';
import storage from '../core/storage';
import onedrive from '../core/cloud/onedrive';
import google from '../core/cloud/google';

export default {
	data() {
		return {
			sort: "id",
			styles: [],
			cloud: {
				from: "onedrive",
				list: []
			},
			options: {
				onlyHtml: false,
				compactPopup: false,
				autoUpdate: true,
				modifyCSP: true,
				showBadge: true
			},
			exportDialog: {
				show: false,
				name: "",
				author: "",
				url: "",
				md5Url: "",
				updateUrl: "",
				originalMd5: "",
				format: "",
				advanced: null
			}
		};
	},
	computed: {
		sortedStyles() {
			let sortMethod = null;
			switch (this.sort) {
				case 'name':
					sortMethod = (e1, e2) => e1.name.localeCompare(e2.name);
					break;
				case 'id':
					sortMethod = (e1, e2) => e1.id > e2.id ? 1 : -1;
					break;
				case 'modified':
					sortMethod = (e1, e2) => e1.lastModified < e2.lastModified ? 1 : -1;
					break;
				case 'status':
					sortMethod = (e1, e2) => {
						if (e1.enabled) {
							return e2.enabled ? 0 : -1;
						} else {
							return e2.enabled ? 1 : 0;
						}
					};
					break;
			}
			return this.styles.sort(sortMethod);
		}
	},
	methods: {
		t: utils.t,
		timestampToString(time) {
			return dateFormat(new Date(time), 'yyyy-mm-dd HH:MM:ss');
		},
		loadStylesFromBackup(content) {
			return new Promise((resolve) => {
				var i = 0, nextStyle;
				function proceed(){
					nextStyle = content[i++];
					if (nextStyle) {
						delete nextStyle["id"];
						styles.install(nextStyle).then(proceed);
					} else {
						i--;
						resolve();
					}
				}
				proceed();
			});
		},
		onStyleEnable(id, enabled) {
			styles.save({
				id: id,
				enabled: enabled
			});
		},
		onStyleAutoUpdate(id, auto) {
			styles.save({
				id: id,
				autoUpdate: auto
			});
		},
		onStyleDelete(style) {
			if (!confirm(utils.t('deleteStyleConfirm'))) {
				return;
			}
			styles.remove(style.id).then(() => {
				this.styles.splice(this.styles.indexOf(style), 1);
			});
		},
		onStyleExport(style) {
			this.exportDialog.name = style.name;
			this.exportDialog.author = style.author || '';
			this.exportDialog.updateUrl = style.updateUrl || '';
			this.exportDialog.md5Url = style.md5Url || '';
			this.exportDialog.originalMd5 = style.originalMd5 || new MD5().update(style.code).digest('hex');
			this.exportDialog.url = style.url || "https://ext.firefoxcn.net/xstyle/md5namespace/" + this.exportDialog.originalMd5;
			this.exportDialog.format = style.type || "css";
			this.exportDialog.advanced = style.advanced || {"item": {}};
			this.exportDialog.show = true;
		},
		onExportToJson() {
			const style = merge({}, this.exportDialog);
			// remove saved
			delete style.advanced.saved;
			file.save(JSON.stringify(style, null, "\t"), 'xstyle-' + style.originalMd5 + '.json');
			this.exportDialog.show = false;
		},
		onExportToUserCss() {
			const style = merge({}, this.exportDialog);
			const content = ["/* ==UserStyle=="];
			content.push("@name " + style.name);
			content.push("@type " + style.type);
			if (style.url) {
				content.push("@homepageURL " + style.url);
			}
			if (style.updateUrl) {
				content.push("@updateURL " + style.updateUrl);
			}
			if (style.md5Url) {
				content.push("@md5URL " + style.md5Url);
			}
			content.push("@originalMD5 " + style.originalMd5);
			if (style.author) {
				content.push("@author " + style.author);
			}
			content.push("@formatVersion 2");
			content.push("@generator xStyle");
			if (Object.keys(style.advanced.item).length > 0) {
				for (const k in style.advanced.item) {
					const it = style.advanced.item[k];
					let itText = `@advanced ${it.type} ${k} "${it.title.replace(/"/g, '%22')}" `;
					switch (item.type) {
						case 'text':
							itText += `"${it.default.replace(/"/g, '%22')}"`;
							break;
						case 'color':
							itText += it.default;
							break;
						case 'image':
							itText += "{\n";
							for (let kk in it.option) {
								itText += `\t ${kk} "${it.option[kk].title.replace(/"/g, '%22')}" "${it.option[kk].value}"\n`;
							}
							itText += "}";
							break;
						case 'dropdown':
							itText += "{\n";
							for (let kk in it.option) {
								itText += `\t ${kk} "${it.option[kk].title.replace(/"/g, '%22')}" <<<EOT\n${it.option[kk].value.replace(/\*\//g, '*\\/')} EOT;\n`;
							}
							itText += "}";
							break;
					}
					content.push(itText);
				}
			}
			content.push("==/UserStyle== */");
			content.push("");
			content.push(style.code);
			file.save(content.join("\n"), 'xstyle-' + style.originalMd5 + '.user.' + style.format);
			this.exportDialog.show = false;
		},
		onImport() {
			file.load(utils.DUMP_FILE_EXT).then(result => {
				const data = JSON.parse(result);
				this.loadStylesFromBackup(data).then(() => {
					window.location.reload();
				});
			});
		},
		onExport() {
			//
		},
		cloudLoadList() {
			//TODO
		}
	},
	created() {
		storage.prefs.onReady()
		.then(prefs => {
			this.sort = prefs.get('manage.sort');
			this.$set(this.options, 'onlyHtml', prefs.get('only-applies-html'));
			this.$set(this.options, 'compactPopup', prefs.get('compact-popup'));
			this.$set(this.options, 'autoUpdate', prefs.get('auto-update'));
			this.$set(this.options, 'modifyCSP', prefs.get('modify-csp'));
			this.$set(this.options, 'showBadge', prefs.get('show-badge'));
			this.$watch('options', newOpt => {
				storage.prefs.set('only-applies-html', newOpt.onlyHtml);
				storage.prefs.set('compact-popup', newOpt.compactPopup);
				storage.prefs.set('auto-update', newOpt.autoUpdate);
				storage.prefs.set('modify-csp', newOpt.modifyCSP);
				storage.prefs.set('show-badge', newOpt.showBadge);
			}, { deep: true });
		})
		browser.runtime.sendMessage({method: "getStyles"})
		.then(r => {
			if (history.state) {
				window.scrollTo(0, history.state.scrollY);
			}
			this.styles = r;
		});
	}
}
</script>