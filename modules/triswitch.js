import {getMyActors} from './shared.js';

const TSCENTER = "center";
const TSLEFT = "left";
const TSRIGHT = "right";


export function setTriswitchState(actorId, newState) {
    if(actorId) {
        let sw = document.getElementById("bsh-triswitch-" + actorId);
        let state = TSCENTER;
        if(sw) {
            // clicking/pressing same side resets to center
            if (sw.classList.contains(newState)) {
                state = TSCENTER;
            } else {
                state = newState;
            }

            sw.classList.remove(TSCENTER, TSLEFT, TSRIGHT);
            sw.classList.add(state);

            console.log("Switch state:", state);
        }
    }
}

export function setTriswitchDisadvantage(actorId) {
    setTriswitchState(actorId, TSLEFT);
}

export function setTriswitchAdvantage(actorId) {
    setTriswitchState(actorId, TSRIGHT);
}

export function resetTriswitchState(actorId) {
    setTriswitchState(actorId, TSCENTER);
}

export function getTriswitchState(actorId) {
    let sw = document.getElementById("bsh-triswitch-" + actorId);
    if(sw) {
        if (sw.classList.contains(TSCENTER)) {
            return TSCENTER;
        }
        if (sw.classList.contains(TSLEFT)) {
            return TSLEFT;
        }
        if (sw.classList.contains(TSRIGHT)) {
            return TSRIGHT
        }
    }
    return "";
}

export function isTriswitchAtDisadvantage(actorId) {
    return getTriswitchState(actorId) == TSLEFT;
}

export function isTriswitchAtAdvantage(actorId) {
    return getTriswitchState(actorId) == TSRIGHT;
}

export function isTriswitchNeutral(actorId) {
    return getTriswitchState(actorId) == TSCENTER;
}



export {TSCENTER, TSLEFT, TSRIGHT};
