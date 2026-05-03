export default class WeaponSheet  extends ItemSheet {
	get template() {
		return("systems/black-sword-hack-mod/templates/sheets/weapon-sheet.html");
	}

	getData() {
		let data = super.getData();
		data.configuration = CONFIG.configuration;
		return(data);
	}
}