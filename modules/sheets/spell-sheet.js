export default class SpellSheet  extends foundry.appv1.sheets.ItemSheet {
    get template() {
        return("systems/black-sword-hack-mod/templates/sheets/spell-sheet.html");
    }

    getData() {
        let data = super.getData();
        data.configuration = CONFIG.configuration;
        data.disabled      = (data.item.system.state === "unavailable");
        return(data);
    }
}