import {logAttributeTest, logAttackRoll} from './chat_messages.js';
import {calculateCharacterData, rollEm} from './shared.js';

export default class AttributeTestDialog extends Dialog {
    constructor(actor, attribute, settings, options={}) {
        let buttons = {rollIt: {callback: () => this._onRollIt(),
                                label: game.i18n.localize("bsh.buttons.rollIt")}};

        super(Object.assign({}, settings, {buttons: buttons}));
        this._actor     = actor;
        this._attribute = attribute;
        this._options   = options;
        this._settings  = settings;
    }

    activateListeners(html) {
        html.find('input[name="threat"]').on("change", this._onNumberChanged.bind(this));
        html.find('input[name="opponent"]').on("change", this._onNumberChanged.bind(this));
        super.activateListeners(html);
    }

    get actor() {
        return(this._actor);
    }

    get adjustment() {
        // let value = this.element[0].querySelector('input[name="adjustment"]').value.trim();
        let value = this.element[0].querySelector('select[name="adjustment"]').value;

        if(value !== "") {
            return(parseInt(value));
        } else {
            return(0);
        }
    }

    get attribute() {
        return(this._attribute);
    }

    get isWithAdvantage() {
        return(this.rollType === "advantage");
    }

    get isWithDisadvantage() {
        return(this.rollType === "disadvantage");
    }

    get rollType() {
        return(this.element[0].querySelector('select[name="type"]').value);
    }

    get threat() {
        let opponentString = this.element[0].querySelector('input[name="opponent"]').value.trim();
        let opponentValue = parseInt(opponentString);
        if(opponentValue<0) {
            opponentValue = 0;
        }
        let threatValue = opponentValue - this._actor.system.level;

        if(threatValue<0) {
            threatValue = 0;
        }            
        return threatValue;
    }

    get totalAdjustment() {
        return(this.threat + this.adjustment);
    }

    _onBonusPenaltyChanged(event) {
        if(event.currentTarget.value.trim() === "") {
            event.currentTarget.value = 0;
        }

    }

    _onRollIt() {
        if (this._settings.isWeaponRoll) {
            logAttackRoll( this._actor.id, 
                           this._settings.weaponId, 
                           this.isWithAdvantage, 
                           this.isWithDisadvantage,
                           false,
                           this.totalAdjustment);
        }
        else {
            logAttributeTest(this._actor,
                             this._attribute,
                             this.isWithAdvantage,
                             this.isWithDisadvantage,
                             false,
                             this.totalAdjustment);
        }
    }

    _onNumberChanged(event) {
        let valueString = event.currentTarget.value.trim();
        let value = (valueString !== "") ? parseInt(valueString) : 0;
        if(value < 0) {
            value = 0;
        }
        event.currentTarget.value = value;

        let threatLevel = value - this._actor.system.level;
        if(threatLevel<0) {
            threatLevel = 0;
        }
        this.element[0].querySelector('span[name="threat"]').innerText = threatLevel;

    }

    static build(actor, attribute, options={}) {
        let settings = Object.assign({}, options);
        let data     = {adjustment:    (settings.adjustment || 0),
                        attribute:     game.i18n.localize(`bsh.attributes.${attribute}.long`),
                        level:         actor.system.level,
                        isWeaponRoll:  (settings.isWeaponRoll || false),
                        weaponId:      (settings.weaponId || -1),
                        configuration: CONFIG.configuration,
                        score:         0,
                        threat:        (settings.threat || 0),
                        type:          (settings.rollType || "standard")};

        calculateCharacterData(actor, CONFIG.configuration);
        data.score     = (actor.system.calculated || actor.system.calculated)[attribute];
        if (settings.isWeaponRoll) {
            settings.title = actor.name + " : " + game.i18n.localize(`bsh.rolls.attacks.${attribute}.title`)
        } else {
            settings.title = actor.name + " : " + game.i18n.localize(`bsh.rolls.tests.${attribute}.title`);
        }

        return(renderTemplate("systems/black-sword-hack-mod/templates/roll-modal.html", data)
                   .then((content) => {
                             settings.content = content;
                             return(new AttributeTestDialog(actor, attribute, settings, options));
                         }));   
    }
}
