export default class SpiritSheet  extends foundry.appv1.sheets.ItemSheet {
	get template() {
		return("systems/black-sword-hack-mod/templates/sheets/spirit-sheet.html");
	}

	getData() {
		let data = super.getData();
		data.configuration = CONFIG.configuration;
		return(data);
	}
}