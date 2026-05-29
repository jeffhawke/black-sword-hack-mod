import {BSHConfiguration} from './configuration.js';
import {rollDoom} from './doom.js';
import {calculateAttributeValues,
        decrementItemQuantity,
        downgradeDie,
        generateDamageRollFormula,
        generateDieRollFormula,
        getObjectField,
        interpolate,
        rollEm,
        setObjectField} from './shared.js';
import {resetTriswitchState, isTriswitchAtDisadvantage, isTriswitchAtAdvantage} from './triswitch.js';


export function logAttackRoll(actorId, weaponId, isWithAdvantage=false, isWithDisadvantage=false, expanded=false) {
    let actor  = game.actors.find((a) => a.id === actorId);

    if(actor) {
        let weapon = actor.items.find((i) => i.id === weaponId);

        if(weapon) {
            let attributes = calculateAttributeValues(actor.system, BSHConfiguration);
            let dice       = null;
            let attribute  = (weapon.system.type !== "ranged" ? "strength" : "dexterity");
            let critical   = {failure: false, success: false};
            let doomed     = (actor.system.doom === "exhausted");
            let data       = {actor:    actor.name, 
                              actorId:  actorId,
                              doomed:   doomed,
                              weapon:   weapon.name,
                              weaponId: weapon.id};

            if(isWithAdvantage) {
                if(!doomed) {
                    dice = new Roll(generateDieRollFormula({kind: "advantage"}));
                } else {
                    dice = new Roll(generateDieRollFormula());
                }
            } else if(isWithDisadvantage) {
                dice = new Roll(generateDieRollFormula({kind: "disadvantage"}));
            } else {
                if(!doomed) {
                    dice = new Roll(generateDieRollFormula());
                } else {
                    dice = new Roll(generateDieRollFormula({kind: "disadvantage"}));
                }
            }
            rollEm(dice).then((roll) => {
                let dieResult = roll.total; //roll.terms[0].results[0].result;
                    critical.failure = (dieResult === 20);
                    critical.success = (dieResult === 1);
                data.roll        = {expanded: expanded,
                                    formula:  roll.formula,
                                    labels:   {title: interpolate("bsh.messages.titles.attackRoll")},
                                    rolled: [],
                                    result:   roll.total,
                                    tested:   true};

                roll.terms[0].results.forEach(a => data.roll.rolled.push({result: a.result, active: a.active}))
                
                data.roll.success = (!critical.failure && attributes[attribute] > data.roll.result);

                if(!critical.success && !critical.failure) {
                    data.roll.labels.result = interpolate(data.roll.success ? "bsh.messages.labels.hit" : "bsh.messages.labels.miss");
                } else {
                    if(critical.success) {
                        data.roll.labels.result = interpolate("bsh.messages.labels.criticalHit");
                    } else {
                        data.roll.labels.result = interpolate("bsh.messages.labels.criticalMiss");
                        data.roll.additional    = {message: game.i18n.localize("bsh.blurbs.critical_failure"),
                                                   show: true};
                    }
                }

                if(data.roll.success) {
                    data.damage = {actorId:  actor.id, 
                                   critical: critical.success,
                                   doomed:   doomed,
                                   formula:  generateDamageRollFormula(actor, weapon, {critical: critical.success, doomed: doomed}),
                                   weapon:   weapon.name,
                                   weaponId: weapon.id};
                }
                resetTriswitchState(actor.id);
                showMessage(actor, "systems/black-sword-hack-mod/templates/messages/attack-roll.hbs", data);
            });
        } else {
            console.error(`Unable to locate weapon id '${weaponId}' on actor '${actor.name}'.`);
        }
    } else {
        console.error(`Unable to locate an actor with the id '${actorId}'.`);
    }
}

export function logAttributeTest(actor, attribute, isWithAdvantage=false, isWithDisadvantage=false, expanded=false, adjustment=0) {
    let attributes = calculateAttributeValues(actor.system, BSHConfiguration);
    let critical   = {failure: false, success: true};
    let doomed     = (actor.system.doom === "exhausted");
    let message    = {actor:    actor.name, 
                      actorId:  actor.id,
                      roll:     {doomed:   doomed,
                                 expanded: expanded,
                                 formula:  (doomed ? "2d20kh" : "1d20"),
                                 labels:   {result: "", title: ""},
                                 result:   0,
                                 rolled: [],
                                 success:  false,
                                 tested:   true}};
    let title      = game.i18n.localize(`bsh.fields.titles.dieRolls.attributes.${attribute}`)

    message.roll.labels.title = game.i18n.localize(`bsh.fields.titles.dieRolls.attributes.${attribute}`);

    if(isWithAdvantage) {
        message.roll.formula = (doomed ? `1d20` : `2d20kl`);
    } else if(isWithDisadvantage) {
        if(!doomed) {
            message.roll.formula = "2d20kh";
        }
    }

    if(adjustment < 0) {
        message.roll.formula = `${message.roll.formula}${adjustment}`; //the minus is already in the value
    } else if(adjustment > 0) {
        message.roll.formula = `${message.roll.formula}+${adjustment}`; //the plus sign must be added
    }

    rollEm(new Roll(message.roll.formula)).then((roll) => {
        let dieResult = roll.total; //roll.terms[0].results[0].result;
            critical.failure = (dieResult === 20);
            critical.success = (dieResult === 1);
        
        roll.terms[0].results.forEach(a => message.roll.rolled.push({result: a.result, active: a.active}))
        
        message.roll.result  = roll.total;
        message.roll.success = (critical.success || roll.total < attributes[attribute]);
        if(message.roll.success) {
            if(critical.success) {
                message.roll.labels.result = game.i18n.localize("bsh.fields.titles.criticalSuccess");
            } else {
                message.roll.labels.result = game.i18n.localize("bsh.fields.titles.success");
            }
        } else {
            if(critical.failure) {
                message.roll.labels.result = game.i18n.localize("bsh.fields.titles.criticalFailure");
                message.roll.additional    = {message: game.i18n.localize("bsh.blurbs.critical_failure"),
                                              show: true};
            } else {
                message.roll.labels.result = game.i18n.localize("bsh.fields.titles.failure");
            }
        }
        resetTriswitchState(actor.id);
        showMessage(actor, "systems/black-sword-hack-mod/templates/messages/die-roll.hbs", message);
    });
}

export function logCallSpirit(spirit, result) {
    let actor   = spirit.actor;
    let message = {actor:   actor.name,
                   actorId: actor.id,
                   spirit:  spirit.name,
                   doomed:  result.doomed,
                   roll:    {expanded: false,
                             formula:  result.formula,
                             labels:   {result: game.i18n.localize("bsh.fields.titles.success"),
                                        title: game.i18n.localize("bsh.messages.titles.callSpirit")},
                             result:   result.result,
                             rolled:   result.rolled.slice(), //shallow copy of array
                             success:  true,
                             tested:   true}};

    showMessage(actor, "systems/black-sword-hack-mod/templates/messages/spirit-success.hbs", message);
}

export function logCallSpiritFailure(spirit, result) {
    let actor   = spirit.actor;
    let message = {actor:   actor.name,
                   actorId: actor.id,
                   spirit:  spirit.name,
                   doomed:  result.doomed,
                   fumble:  (result.die.ending === "exhausted"),
                   roll:    {expanded: false,
                             formula:  result.formula,
                             labels:   {result: game.i18n.localize("bsh.fields.titles.failure"),
                                        title: game.i18n.localize("bsh.messages.titles.callSpirit")},
                             result:   result.result,
                             rolled:   result.rolled.slice(), //shallow copy of array
                             success:  false,
                             tested:   true}};

    showMessage(actor, "systems/black-sword-hack-mod/templates/messages/spirit-failure.hbs", message);
}

export function logGenericDamageRoll(actor, dieType, title, isWithAdvantage=false, isWithDisadvantage=false) {
    let doomed  = (actor.system.doom === "exhausted");
    let formula = (doomed ? `2${dieType}kl` : `1${dieType}`);
    let message = {actor:    actor.name, 
                   actorId:  actor.id,
                   doomed:   doomed,
                   roll:     {expanded:   true,
                              formula:    formula,
                              labels:     {title: title},
                              result:     0,
                              rolled:     [],
                              tested:     false,
                              }
                  };

    if(isWithAdvantage) {
        formula = (doomed ? `1${dieType}` : `2${dieType}kh`);
    } else if(isWithDisadvantage) {
        if(!doomed) {
            formula = `2${dieType}kl`;
        }
    }
    message.roll.formula = formula;
    rollEm(new Roll(formula)).then((roll) => {
        message.roll.result = roll.total;
        roll.terms[0].results.forEach(a => message.roll.rolled.push({result: a.result, active: a.active}));
        resetTriswitchState(actor.id);
        showMessage(actor, "systems/black-sword-hack-mod/templates/messages/damage-roll.hbs", message);
    });
}


export function logDamageRoll(actor, rollData) {

    let data = {actor:  actor.name,
                doomed: rollData.doomed,
                roll: { expanded: true,
                        formula: rollData.formula,
                        labels: {title: interpolate("bsh.messages.titles.damageRoll")},
                        result: 0,
                        rolled: [],
                        tested: false
                      }
              };
    let formula = rollData.formula;
    rollEm(new Roll(formula)).then((roll) => {
        data.roll.result  = roll.total;
        roll.terms[0].results.forEach(a => data.roll.rolled.push({result: a.result, active: a.active}));
        resetTriswitchState(actor.id);
        showMessage(actor, "systems/black-sword-hack-mod/templates/messages/damage-roll.hbs", data);
    });

}

export function logDefendRoll(event) {
    let element = event.currentTarget;

    if(element.dataset.attribute && element.dataset.actor) {
        let actor = game.actors.find((a) => a.id === element.dataset.actor);

        if(actor) {
            
            let isWithDisadvantage = isTriswitchAtDisadvantage(actor.id);
            let isWithAdvantage = isTriswitchAtAdvantage(actor.id);
            if(event.shiftKey) {
                isWithAdvantage = true;
                isWithDisadvantage = false;
            } else if(event.ctrlKey) {
                isWithAdvantage = false;
                isWithDisadvantage = true;
            }             
            
            if(element.dataset.attribute === "strength") {
                logParryRoll(actor, isWithAdvantage, isWithDisadvantage);
            } else {
                logDodgeRoll(actor, isWithAdvantage, isWithDisadvantage);
            }
        } else {
            console.error(`Unable to find an actor with the id of '${element.dataset.id}'.`);
        }
    } else {
        console.error("Defend roll request but requesting element is missing an attribute and/or id data attribute.");
    }
}

export function logDemonSummoning(demon, result) {
    let actor   = demon.actor;
    let message = {actor:   actor.name,
                   actorId: actor.id,
                   demon:   demon.name,
                   doomed:  result.doomed,
                   roll:    {expanded: false,
                             formula:  result.formula,
                             labels:   {result: game.i18n.localize("bsh.fields.titles.success"),
                                        title: game.i18n.localize("bsh.messages.titles.summonDemon")},
                             result:   result.result,
                             rolled:   result.rolled.slice(), //shallow copy of array
                             success:  true,
                             tested:   true}};

    showMessage(actor, "systems/black-sword-hack-mod/templates/messages/demon-success.hbs", message);
}

export function logDemonSummoningFailure(demon, result) {
    let actor   = demon.actor;
    let message = {actor:   actor.name,
                   actorId: actor.id,
                   demon:   demon.name,
                   doomed:  result.doomed,
                   fumble:  (result.die.ending === "exhausted"),
                   roll:    {expanded: false,
                             formula:  result.formula,
                             labels:   {result: game.i18n.localize("bsh.fields.titles.failure"),
                                        title: game.i18n.localize("bsh.messages.titles.summonDemon")},
                             result:   result.result,
                             rolled:   result.rolled.slice(), //shallow copy of array
                             success:  false,
                             tested:   true}};

    showMessage(actor, "systems/black-sword-hack-mod/templates/messages/demon-failure.hbs", message);
}

export function logDieRoll(actor, dieType, title, isWithAdvantage=false, isWithDisadvantage=false) {
    let doomed  = (actor.system.doom === "exhausted");
    let formula = (doomed ? `2${dieType}kl` : `1${dieType}`);
    let message = {actor:    actor.name, 
                   actorId:  actor.id,
                   doomed:   doomed,
                   roll:     {expanded:   true,
                              formula:    formula,
                              labels:     {title: title},
                              result:     0,
                              rolled:     [],
                              tested:     false,
                              }
                  };

    if(isWithAdvantage) {
        formula = (doomed ? `1${dieType}` : `2${dieType}kh`);
    } else if(isWithDisadvantage) {
        if(!doomed) {
            formula = `2${dieType}kl`;
        }
    }
    message.roll.formula = formula;
    rollEm(new Roll(formula)).then((roll) => {
        message.roll.result = roll.total;
        roll.terms[0].results.forEach(a => message.roll.rolled.push({result: a.result, active: a.active}));
        resetTriswitchState(actor.id);
        showMessage(actor, "systems/black-sword-hack-mod/templates/messages/die-roll.hbs", message);
    });
}

export function logDodgeRoll(actor, isWithAdvantage=false, isWithDisadvantage=false) {
    let attributes = calculateAttributeValues(actor.system, BSHConfiguration);
    let critical   = {failure: false, success: false};
    let doomed     = (actor.system.doom === "exhausted");
    let title      = interpolate("bsh.messages.titles.dodgeRoll");
    let message    = {actor:    actor.name, 
                      actorId:  actor.id,
                      doomed:   doomed,
                      roll:     {expanded: false,
                                 formula:  "",
                                 labels:   {title: title},
                                 rolled:   [],
                                 result:   0,
                                 tested:   true}};

    if(!doomed) {
        if(isWithAdvantage) {
            message.roll.formula = "2d20kl";
        } else if(isWithDisadvantage) {
            message.roll.formula = "2d20kh";
        } else {
            message.roll.formula = "1d20";
        }
    } else {
        message.roll.formula = (isWithAdvantage || shield ? "1d20" : "2d20kh");
    }
    rollEm(new Roll(message.roll.formula)).then((roll) => {
        let dieResult = roll.total; //roll.terms[0].results[0].result;
            critical.failure = (dieResult === 20);
            critical.success = (dieResult === 1);
        message.roll.result  = roll.total;
        message.roll.success = (critical.success || roll.total < attributes["dexterity"]);
        roll.terms[0].results.forEach(a => message.roll.rolled.push({result: a.result, active: a.active}));


        if(!critical.success && !critical.failure) {
            message.roll.labels.result = interpolate(message.roll.success ? "bsh.messages.labels.success" : "bsh.messages.labels.failure");
        } else {
            if(critical.success) {
                message.roll.labels.result = interpolate("bsh.messages.labels.criticalSuccess");
            } else {
                message.roll.labels.result = interpolate("bsh.messages.labels.criticalFailure");
                message.roll.additional    = {message: game.i18n.localize("bsh.blurbs.defend_fumble"),
                                              show: true};
            }
        }

        resetTriswitchState(actor.id);
        showMessage(actor, "systems/black-sword-hack-mod/templates/messages/die-roll.hbs", message);
    });
}

export function logDoomDieRoll(actor, isWithAdvantage=false, isWithDisadvantage=false) {
    if(actor.system.doom !== "exhausted") {
        let message  = {actor:    actor.name,
                        actorId:  actor.id,
                        roll:     {expanded: false,
                                   formula:  "",
                                   labels:   {result: "",
                                              title:  interpolate("bsh.messages.titles.doomRoll")},
                                   result:   0,
                                   rolled:   [],
                                   tested:   true}};
        let rollType = "standard";
        let result   = null;

        if(isWithAdvantage) {
            rollType = "advantage";
        } else if(isWithDisadvantage) {
            rollType = "disadvantage";
        }
        rollDoom(actor, rollType).then((result) => {
            message.roll.formula = result.formula;
            message.roll.result  = result.result;
            message.roll.rolled  = result.rolled.slice(); //shallow copy of array
            message.roll.success = !result.downgraded;
            if(!message.roll.success) {
                message.roll.labels.result = interpolate("bsh.fields.titles.failure");
                message.doomed = (result.die.ending === "exhausted");
            } else {
                message.roll.labels.result = interpolate("bsh.fields.titles.success");
            }

            resetTriswitchState(actor.id);
            showMessage(actor, "systems/black-sword-hack-mod/templates/messages/doom-roll.hbs", message);
        });
    } else {
        console.error(`Unable to make a doom roll for '${actor.name}' as their doom die is exhausted.`);
        ui.notifications.error(interpolate("bsh.messages.doom.exhausted", {name: actor.name}));
    }
}

export function logInitiativeRoll(event) {
    let element = event.currentTarget;

    if(element.dataset.actor) {
        let actor      = game.actors.find((a) => a.id === element.dataset.actor);
        let attributes = calculateAttributeValues(actor.system, BSHConfiguration);
        let critical   = {failure: false, success: false};
        let doomed     = (actor.system.doom === "exhausted");
        let title      = interpolate("bsh.messages.titles.initiativeRoll");
        let message    = {actor:    actor.name, 
                          actorId:  actor.id,
                          doomed:   doomed,
                          roll:     {expanded: false,
                                     formula:  "",
                                     labels:   {title: title},
                                     result:   0,
                                     rolled:   [],
                                     tested:   true}};

        
        let isWithDisadvantage = isTriswitchAtDisadvantage(actor.id);
        let isWithAdvantage = isTriswitchAtAdvantage(actor.id);
        if(event.shiftKey) {
            isWithAdvantage = true;
            isWithDisadvantage = false;
        } else if(event.ctrlKey) {
            isWithAdvantage = false;
            isWithDisadvantage = true;
        }     
        
        if(!doomed) {
            if(isWithAdvantage) {
                message.roll.formula = "2d20kl";
            } else if(isWithDisadvantage) {
                message.roll.formula = "2d20kh";
            } else {
                message.roll.formula = "1d20";
            }
        } else {
            message.roll.formula = (isWithAdvantage ? "1d20" : "2d20kh");
        }
        rollEm(new Roll(message.roll.formula)).then((roll) => {
            let dieResult = roll.total; //roll.terms[0].results[0].result;
                critical.failure = (dieResult === 20);
                critical.success = (dieResult === 1);
            message.roll.result  = roll.total;
            message.roll.success = (critical.success || roll.total < attributes["wisdom"]);
            roll.terms[0].results.forEach(a => message.roll.rolled.push({result: a.result, active: a.active}));

            if(!critical.success && !critical.failure) {
                message.roll.labels.result = interpolate(message.roll.success ? "bsh.messages.labels.success" : "bsh.messages.labels.failure");
            } else {
                if(critical.success) {
                    message.roll.labels.result = interpolate("bsh.messages.labels.criticalSuccess");
                } else {
                    message.roll.labels.result = interpolate("bsh.messages.labels.criticalFailure");
                    message.roll.additional    = {message: game.i18n.localize("bsh.blurbs.critical_failure"),
                                                  show: true};
                }
            }

            resetTriswitchState(actor.id);
            showMessage(actor, "systems/black-sword-hack-mod/templates/messages/die-roll.hbs", message);
        });
    } else {
        console.error("Initiative roll requested but requesting element is missing an actor id data attribute.");
    }
}

export function logItemUsageDieRoll(item, field, isWithAdvantage=false, isWithDisadvantage=false) {
    let usageDie = getObjectField(`${field}.current`, item.system);

    if(!usageDie || usageDie === "^") {
        usageDie = getObjectField(`${field}.maximum`, item.system);
    }

    if(usageDie) {
        if(usageDie !== "exhausted") {
            let message = {downgraded: false,
                           item:       item.name,
                           itemId:     item.id,
                           roll:       {expanded: false,
                                        formula:  `1${usageDie}`,
                                        labels:   {result: "",
                                                   title:  interpolate("bsh.messages.titles.usageDieRoll")},
                                        result:   0,
                                        rolled:   [],
                                        tested:   true}};

            if(isWithAdvantage) {
                message.roll.formula = `2${usageDie}kh`;
            } else if(isWithDisadvantage) {
                message.roll.formula = `2${usageDie}kl`;
            }
            rollEm(new Roll(message.roll.formula)).then((roll) => {
                message.roll.result = roll.total;
                roll.terms[0].results.forEach(a => message.roll.rolled.push({result: a.result, active: a.active}));
                if(roll.total < 3) {
                    let newDie = downgradeDie(usageDie);
                    let data   = setObjectField(`${field}.current`, newDie);

                    message.downgraded         = true;
                    message.roll.success       = false;
                    message.roll.labels.result = interpolate("bsh.fields.titles.failure");
                    item.update({system: data}, {diff: true});
                    if(newDie === "exhausted") {
                        decrementItemQuantity(item.id);
                        message.feedback = game.i18n.localize("bsh.messages.usageDie.exhausted");
                    } else {
                        message.feedback = interpolate(game.i18n.localize("bsh.messages.usageDie.downgraded"), {die: newDie});
                    }
                } else {
                    message.roll.success       = true;
                    message.roll.labels.result = interpolate("bsh.fields.titles.success");                
                }

                if(item.actor) {
                    resetTriswitchState(item.actor.id);
                }
                showMessage(item.actor, "systems/black-sword-hack-mod/templates/messages/usage-die-roll.hbs", message);
            });
        } else {
            console.warn(`Unable to roll usage die for item id ${item.id} as the particular usage die request is exhausted.`);
            ui.notifications.error(game.i18n.localize("bsh.errors.usageDie.exhausted"));
        }
    } else {
        console.error(`Unable to locate the ${field} usage die setting for item id ${item.id} (${item.name}).`);
        ui.notifications.error(game.i18n.localize("bsh.errors.usageDie.notFound"));
    }

}

export function logParryRoll(actor, isWithAdvantage=false, isWithDisadvantage=false) {
    let attributes = calculateAttributeValues(actor.data.data, BSHConfiguration);
    let critical   = {failure: false, success: false};
    let doomed     = (actor.system.doom === "exhausted");
    let title      = interpolate("bsh.messages.titles.parryRoll");
    let message    = {actor:    actor.name, 
                      actorId:  actor.id,
                      doomed:   doomed,
                      roll:     {expanded: false,
                                 formula:  "",
                                 labels:   {title: title},
                                 result:   0,
                                 rolled:   [],
                                 tested:   true}};
    let shield     = (actor.system.armour.shield === "yes");

    if(!doomed) {
        if(isWithDisadvantage && !shield) {
            message.roll.formula = "2d20kh";
        } else if((isWithAdvantage || shield) && !isWithDisadvantage) {
            message.roll.formula = "2d20kl";
        } else {
            message.roll.formula = "1d20";
        }
    } else {
        message.roll.formula = (isWithAdvantage || shield ? "1d20" : "2d20kh");
    }
    rollEm(new Roll(message.roll.formula)).then((roll) => {
        let dieResult = roll.total; //roll.terms[0].results[0].result;
            critical.failure = (dieResult === 20);
            critical.success = (dieResult === 1);
        message.roll.result  = roll.total;
        message.roll.success = (critical.success || roll.total < attributes["strength"]);
        roll.terms[0].results.forEach(a => message.roll.rolled.push({result: a.result, active: a.active}));

        if(!critical.success && !critical.failure) {
            message.roll.labels.result = interpolate(message.roll.success ? "bsh.messages.labels.success" : "bsh.messages.labels.failure");
        } else {
            if(critical.success) {
                message.roll.labels.result = interpolate("bsh.messages.labels.criticalSuccess");
            } else {
                message.roll.labels.result = interpolate("bsh.messages.labels.criticalFailure");
                message.roll.additional    = {message: game.i18n.localize("bsh.blurbs.defend_fumble"),
                                              show: true};
            }
        }

        resetTriswitchState(actor.id);
        showMessage(actor, "systems/black-sword-hack-mod/templates/messages/die-roll.hbs", message);
    });
}

export function logPerceptionRoll(event) {
    let element = event.currentTarget;

    if(element.dataset.actor) {
        let actor      = game.actors.find((a) => a.id === element.dataset.actor);
        let attributes = calculateAttributeValues(actor.system, BSHConfiguration);
        let critical   = {failure: false, success: false};
        let doomed     = (actor.system.doom === "exhausted");
        let title      = interpolate("bsh.messages.titles.perceptionRoll");
        let message    = {actor:    actor.name, 
                          actorId:  actor.id,
                          doomed:   doomed,
                          roll:     {expanded: false,
                                     formula:  "",
                                     labels:   {title: title},
                                     result:   0,
                                     rolled:   [],
                                     tested:   true}};

        let isWithDisadvantage = isTriswitchAtDisadvantage(actor.id);
        let isWithAdvantage = isTriswitchAtAdvantage(actor.id);
        if(event.shiftKey) {
            isWithAdvantage = true;
            isWithDisadvantage = false;
        } else if(event.ctrlKey) {
            isWithAdvantage = false;
            isWithDisadvantage = true;
        }     
        
        if(!doomed) {
            if(isWithAdvantage) {
                message.roll.formula = "2d20kl";
            } else if(isWithDisadvantage) {
                message.roll.formula = "2d20kh";
            } else {
                message.roll.formula = "1d20";
            }
        } else {
            message.roll.formula = (isWithAdvantage ? "1d20" : "2d20kh");
        }
        rollEm(new Roll(message.roll.formula)).then((roll) => {
            let dieResult = roll.total; //roll.terms[0].results[0].result;
                critical.failure = (dieResult === 20);
                critical.success = (dieResult === 1);
            message.roll.result  = roll.total;
            message.roll.success = (critical.success || roll.total < attributes["intelligence"]);
            roll.terms[0].results.forEach(a => message.roll.rolled.push({result: a.result, active: a.active}));

            if(!critical.success && !critical.failure) {
                message.roll.labels.result = interpolate(message.roll.success ? "bsh.messages.labels.success" : "bsh.messages.labels.failure");
            } else {
                if(critical.success) {
                    message.roll.labels.result = interpolate("bsh.messages.labels.criticalSuccess");
                } else {
                    message.roll.labels.result = interpolate("bsh.messages.labels.criticalFailure");
                    message.roll.additional    = {message: game.i18n.localize("bsh.blurbs.critical_failure"),
                                                  show: true};
                }
            }

            resetTriswitchState(actor.id);
            showMessage(actor, "systems/black-sword-hack-mod/templates/messages/die-roll.hbs", message);
        });
    } else {
        console.error("Perception roll requested but requesting element is missing an actor id data attribute.");
    }
}

export function logSpellCast(spell, result) {
    let actor   = spell.actor;
    let message = {actor:   actor.name,
                   actorId: actor.id,
                   spell:   spell.name,
                   doomed:  result.doomed,
                   roll:    {expanded: false,
                             formula:  result.formula,
                             labels:   {result: game.i18n.localize("bsh.fields.titles.success"),
                                        title: game.i18n.localize("bsh.messages.titles.castSpell")},
                             result:   result.result,
                             rolled:   [],
                             success:  true,
                             tested:   true}};
                             
    result.terms[0].results.forEach(a => message.roll.rolled.push({result: a.result, active: a.active}));

    showMessage(actor, "systems/black-sword-hack-mod/templates/messages/spell-success.hbs", message);
}

export function logSpellCastUnified(spell, result, success) {
    let actor   = spell.actor;
    let message = {actor:   actor.name,
                   actorId: actor.id,
                   spell:   spell.name,
                   doomed:  (actor.system.doom === "exhausted"),
                   fumble:  (result.total === 20),
				   critical:(result.total === 1),
                   roll:    {expanded: false,
                             formula:  result.formula,
                             labels:   {result: "",
                                        title: game.i18n.localize("bsh.messages.titles.castSpell")},
                             result:   result.result,
                             rolled:   [],
                             success:  success,
                             tested:   true}};
    result.terms[0].results.forEach(a => message.roll.rolled.push({result: a.result, active: a.active}));

    if (success) {
        message.roll.labels.result = game.i18n.localize("bsh.fields.titles.success");
        showMessage(actor, "systems/black-sword-hack-mod/templates/messages/spell-success.hbs", message);

    } else {
        message.roll.labels.result = game.i18n.localize("bsh.fields.titles.failure");
        showMessage(actor, "systems/black-sword-hack-mod/templates/messages/spell-failure.hbs", message);
    }
} 

export function logSpellCastFailure(spell, result) {
    let actor   = spell.actor;
    let message = {actor:   actor.name,
                   actorId: actor.id,
                   spell:  spell.name,
                   doomed:  result.doomed,
                   fumble:  (result.total === 20),
                   roll:    {expanded: false,
                             formula:  result.formula,
                             labels:   {result: game.i18n.localize("bsh.fields.titles.failure"),
                                        title: game.i18n.localize("bsh.messages.titles.castSpell")},
                             result:   result.result,
                             rolled:   [],
                             success:  false,
                             tested:   true}};
    
    result.terms[0].results.forEach(a => message.roll.rolled.push({result: a.result, active: a.active}));     

    showMessage(actor, "systems/black-sword-hack-mod/templates/messages/spell-failure.hbs", message);
}

export function showMessage(actor, templateKey, data) {
    foundry.applications.handlebars.getTemplate(templateKey)
        .then((template) => {
            let message = {speaker: ChatMessage.getSpeaker(actor=actor),
                           user:    game.user};

            message.content = template(data);
            ChatMessage.create(message);
        });
}

export function toggleAttributeTestDisplay(event) {
    let element = event.currentTarget;
    let parent  = element.parentElement;

    event.preventDefault();
    if(parent) {
        let details = parent.querySelector(".bsh-roll-details");

        if(details) {
            if(details.classList.contains("bsh-hidden")) {
                details.classList.remove("bsh-hidden");
            } else {
                details.classList.add("bsh-hidden");
            }
        }
    }
}