import {logSpellCastSimplified} from './chat_messages.js';
import {BSHConfiguration} from './configuration.js';
import {calculateAttributeValues,
        getOwnedItemById,
        interpolate,
        rollEm} from './shared.js';

/**
 * Retrieves a spell and attempts to cast it (if possible), reporting the
 * result to chat.
 * This kind of function is usually in chat_messages.js but in this case 
 * we need to update the spell after the roll result is known
 */
export async function castSpell(spellId) {
    let spell = getOwnedItemById(spellId);
    if(spell && spell.type === "spell") {
        if(spell.system.state !== "unavailable") {
			
            let dice       = null;
            let data       = {system: {state: "cast"}};
			
			let actor   = spell.actor;
            let doomed     = (actor.system.doom === "exhausted");
            let attributes = calculateAttributeValues(actor.system, BSHConfiguration);
			
			let critical   = {failure: false, success: false};
			let message = {actor:    actor,
						   actorName:actor.name,
						   actorId:  actor.id,
						   spell:    spell.name,
						   doomed:   doomed,
						   fumble:   false, 
						   roll:     {expanded: false,
									  formula:  "",
									  labels:   {result: "",
									 			title: game.i18n.localize("bsh.messages.titles.castSpell")},
									  result:   0,
									  rolled:   [],
									  success:  false,
									  tested:   true}};

            /* 
             * casting a spell has not an advantage or disadvantage modifier with the keys
             * instead the spell will be cast at a disadvantage if it's already been casted at least once in the day
             */
            if(spell.system.state === "available" && !doomed) {
                message.roll.formula = "1d20";
            } else {
                message.roll.formula = "2d20kh";
            }
			
            rollEm(new Roll(message.roll.formula)).then((roll) => {
				
				let dieResult = roll.total; //roll.terms[0].results[0].result;
					critical.failure = false; //(dieResult === 20);
					critical.success = false; //(dieResult === 1);
				message.roll.result  = roll.total;
				roll.terms[0].results.forEach(a => {
					message.roll.rolled.push({result: a.result, active: a.active});
					critical.failure = critical.failure || (a.result == 20);
					critical.success = critical.success || (a.result == 1);
				});
				message.fumble = critical.failure;
				
				message.roll.success = critical.success || (!critical.failure && roll.total < attributes["intelligence"]);
				
                if(!message.roll.success) {
                    data.system.state = "unavailable";
                }
                spell.update(data, {diff: true});
				
				logSpellCastSimplified(message);
            });
			
			
        } else {
            console.warn(`Unable to cast the ${spell.name} spell as it is not currently available for use.`);
        }
    } else {
        console.error(`Unable to locate a spell with the id ${spellId}.`);
        ui.notifications.error(game.i18n.localize("bsh.errors.spells.notFound"));
    }
}

/**
 * Resets a spell state.
 */
export async function resetSpellState(spellId) {
    let spell = getOwnedItemById(spellId);

    if(spell && spell.type === "spell") {
        spell.update({system: {state: "available"}}, {diff: true});
    } else {
        console.error(`Unable to locate a spell with the id ${spellId}.`);
        ui.notifications.error(game.i18n.localize("bsh.errors.spells.notFound"));
    }
}

export async function resetSpellStatesForActor(actorId) {
    let actor = game.actors.find((a) => a.id === actorId);

    if(actor) {
        actor.items.forEach((item) => {
            if(item.type === "spell") {
                resetSpellState(item.id);
            }
        });
    } else {
        console.error(`Unable to locate an actor with an id of ${actorId}.`);
        ui.notifications.error(game.i18n.localize("bsh.errors.actors.notFound"));
    }
}
