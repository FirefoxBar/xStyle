<template>
	<div class="main">
		<md-tabs class="md-primary main-menu" md-elevation="1" md-active-tab="tab-style-list">
			<md-tab id="tab-style-list" :md-label="t('styles')" md-icon="style">
				<md-menu md-size="medium" md-align-trigger>
					<md-button md-menu-trigger>{{t('sortStyles')}}</md-button>
					<md-menu-content class="sort-select">
						<md-menu-item :class="{ active: sort == 'id' }" @click="sort = 'id'">{{t('sortStylesById')}}</md-menu-item>
						<md-menu-item :class="{ active: sort == 'status' }" @click="sort = 'status'">{{t('sortStylesByStatus')}}</md-menu-item>
						<md-menu-item :class="{ active: sort == 'name' }" @click="sort = 'name'">{{t('sortStylesByName')}}</md-menu-item>
						<md-menu-item :class="{ active: sort == 'modified' }" @click="sort = 'modified'">{{t('sortStylesByModified')}}</md-menu-item>
					</md-menu-content>
				</md-menu>
				<md-button id="update-all-styles" class="with-icon"><md-icon>refresh</md-icon>{{t('updateAllStyles')}}</md-button>
				<md-button href="edit.html" class="with-icon"><md-icon>add</md-icon>{{t('addStyleLabel')}}</md-button>
				<md-button id="install-from-file" class="with-icon"><md-icon>create_new_folder</md-icon>{{t('installFromFile')}}</md-button>
				<md-card v-for="s of styles" :key="s.id" class="group-item">
					<md-card-area>
						<md-card-header>
							<div class="md-title">{{s.name}}</div>
							<md-switch v-model="s.enable" class="md-primary" :data-id="s.id" @change="newValue => onStyleEnable(r, newValue)"></md-switch>
						</md-card-header>
						<md-card-content>
						</md-card-content>
						<md-card-actions md-alignment="left">
							<md-button class="md-primary" :href="`edit.html?id=${s.id}`">{{t('editStyleLabel')}}</md-button>
							<md-button class="md-primary">{{t('deleteStyleLabel')}}</md-button>
							<md-button class="md-primary">{{t('export')}}</md-button>
							<md-button class="md-primary">{{t('advancedTitle')}}</md-button>
							<md-button class="md-primary">{{t('updateOneStyle')}}</md-button>
							<md-button class="md-primary">{{t('autoUpdateLabel')}}</md-button>
						</md-card-actions>
					</md-card-area>
				</md-card>
			</md-tab>
			<md-tab id="tab-options" :md-label="t('optionsHeading')" md-icon="settings">
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
			<md-tab id="tab-backup" :md-label="t('exportAndImport')" md-icon="settings_backup_restore">
				<md-card>
					<md-card-header>
						<div class="md-title">{{t('exportAndImport')}}</div>
					</md-card-header>
					<md-card-content>
						<div class="md-layout md-gutter">
						</div>
					</md-card-content>
				</md-card>
			</md-tab>
		</md-tabs>
	</div>
</template>

<style lang="scss">
.sort-select .active {
	font-weight: bold;
}
</style>

<script>
import browser from 'webextension-polyfill';
import storage from '../core/storage';

export default {
	data() {
		return {
			sort: "",
			styles: []
		};
	},
	methods: {
		sortStyles(method, styles) {
			if (!method) {
				method = this.sort;
			}
			let sortMethod = null;
			switch (method) {
				case 'name':
					sortMethod = (e1, e2) => e1.name.localeCompare(e2.name);
					break;
				case 'id':
					sortMethod = (e1, e2) => e1.id > e2.id;
					break;
				case 'modified':
					sortMethod = (e1, e2) => e1.lastModified < e2.lastModified;
					break;
				case 'status':
					sortMethod = (e1, e2) => {
						if (e1.enabled) {
							return e2.enabled ? 0 : -1;
						} else {
							return e2.enable ? 1 : 0;
						}
					};
					break;
			}
			styles.sort(sortMethod);
		},
		onChangeSort(m) {
			this.sort = m;
			this.sortStyles(m, this.styles);
		}
	},
	mounted() {
		storage.prefs.onReady((prefs) => {
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
			this.$watch('sort', newOpt => {
				storage.prefs.set('manage.sort', newOpt);
			});
		})
		.then(browser.runtime.sendMessage({method: "getStyles"}))
		.then(r => {
			if (history.state) {
				window.scrollTo(0, history.state.scrollY);
			}
			this.sortStyles(null, r);
			this.styles = r;
		});
	}
}
</script>