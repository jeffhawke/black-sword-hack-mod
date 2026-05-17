import {BSHConfiguration} from './configuration.js';
import {CLASSIC_ORIGINS} from './constants.js';
import {stringToKey} from './shared.js';

async function generateBirthPlace(origin) {
    if(origin && BSHConfiguration.birthList[origin]) {
        return((new Roll("1d20")).evaluate({async: true})
               .then((roll) => game.i18n.localize(BSHConfiguration.birthList[origin][roll.total])));
    } else {
        return((new Roll("2d6")).evaluate({async: true})
               .then((roll) => game.i18n.localize(BSHConfiguration.classicBirthList[roll.total])));
    }
}

function getBackgrounds(firstOriginKey, ...otherOriginKeys) {
    let backgrounds = [];
    let keys        = [firstOriginKey, ...otherOriginKeys];
    let origins     = getOrigins().filter((origin) => keys.includes(stringToKey(origin.name)));

    origins.forEach((origin) => {
        (origin.system ? origin.system.backgrounds : origin.backgrounds).forEach((entry) => {
            let background = JSON.parse(entry);

            if(!isCustomOriginsActive()) {
                background.origin = stringToKey(origin.name);
            } else {
                background.origin = origin.id;
            }
            backgrounds.push(background);
        });
    });

    backgrounds.sort((lhs, rhs) => lhs.name.localeCompare(rhs.name));

    return(backgrounds);
}

function getCharacterBackgrounds(character) {
    let backgrounds    = [];
    let originIds      = getOrigins().map((e) => stringToKey(e.name));
    let allBackgrounds = getBackgrounds(...originIds);

    ["first", "second", "third"].forEach((key) => {
        let background = allBackgrounds.find((b) => b.key === character.system.backgrounds[key]);

        if(background) {
            backgrounds.push(background);
        }
    });
    return(backgrounds);
}

function getOriginKeys() {
    return(getOrigins().map((o) => stringToKey(o.name)));
}

function getOrigins() {
    if(isCustomOriginsActive()) {
        return(game.items.filter((item) => item.type === "origin"));
    } else {
        return(Object.values(CLASSIC_ORIGINS));
    }
}

function getCustomOrigins() {
    return(game.items.filter((item) => item.type === "origin"));
}

function isCustomOriginsActive() {
    return(game.settings.get("black-sword-hack-mod", "customOrigins"));
}

export {
    generateBirthPlace,
    getBackgrounds,
    getCharacterBackgrounds,
    getCustomOrigins,
    getOriginKeys,
    getOrigins,
    isCustomOriginsActive
};
