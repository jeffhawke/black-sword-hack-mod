
const TSCENTER = "center";
const TSLEFT = "left";
const TSRIGHT = "right";


export function setTriswitchState(newState) {
	const sw = document.getElementById("bsh-triswitch");
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


export function getTriswitchState() {
	const sw = document.getElementById("bsh-triswitch");
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


export {TSCENTER, TSLEFT, TSRIGHT};


/* keyboard */
/*
document.addEventListener("keydown", (e) => {

	if (e.repeat)
		return;

	if (e.key === "Shift") {
		setState("right");
	}

	if (e.key === "Control") {
		setState("left");
	}

	if (e.key === "Escape") {
		setState("center");
	}
});
*/

/* mouse */
/*
sw.querySelector(".bsh-triswitch-left-segment")
	.addEventListener("click", () => {
		setState("left");
	});

sw.querySelector(".bsh-triswitch-right-segment")
	.addEventListener("click", () => {
		setState("right");
	});

sw.querySelector(".bsh-triswitch-center-segment")
	.addEventListener("click", () => {
		setState("center");
	});

*/
