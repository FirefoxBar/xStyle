<template><template>
	<div class="main">
		<md-tabs class="md-primary main-menu" md-elevation="1" md-active-tab="tab-style-list">
			<md-tab id="tab-style-list" :md-label="t('styles')" md-icon="style">
				<md-menu md-size="medium" md-align-trigger>
					<md-button md-menu-trigger>{{t('sortStyles')}}</md-button>
					<md-menu-content>
						<md-menu-item>{{t('sortStylesById')}}</md-menu-item>
						<md-menu-item>{{t('sortStylesByStatus')}}</md-menu-item>
						<md-menu-item>{{t('sortStylesByName')}}</md-menu-item>
						<md-menu-item>{{t('sortStylesByModified')}}</md-menu-item>
					</md-menu-content>
				</md-menu>
				<md-button id="update-all-styles" class="with-icon"><md-icon>refresh</md-icon>{{t('updateAllStyles')}}</md-button>
				<md-button href="edit.html" class="with-icon"><md-icon>add</md-icon>{{t('addStyleLabel')}}</md-button>
				<md-button id="install-from-file" class="with-icon"><md-icon>create_new_folder</md-icon>{{t('installFromFile')}}</md-button>
				<md-card v-for="s of style" :key="s.id" class="group-item">
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
			<md-tab id="tab-style-list" :md-label="t('styles')" md-icon="style"></md-tab>
		</md-tabs>
	</div>
</template>

<script>
export default {
	data: function() {
		return {};
	}
}
</script>
