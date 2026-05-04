export default class GiftSheet  extends foundry.appv1.sheets.ItemSheet {
    static get defaultOptions() {
        return(foundry.utils.mergeObject(super.defaultOptions,
                                         {classes:  ["bsh", "bsh-sheet", "bsh-gift-sheet", "sheet"],
                                          height:   450,
                                          template: "systems/bsh/templates/sheets/gift-sheet.html",
                                          width:    600}));
    }

	get template() {
		return("systems/black-sword-hack-mod/templates/sheets/gift-sheet.html");
	}

	getData() {
		let context = super.getData();

		context.configuration = CONFIG.configuration;
		return(context);
	}
}