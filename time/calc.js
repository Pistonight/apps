var AdderOfTime = (function(){
    var MS = 1000n;
    var SECOND = MS;
    var MINUTE = 60n * SECOND;
    var HOUR = 60n * MINUTE;
    var DAY = 24n * HOUR;
    var unitMap = {
        "D":DAY,
        "H":HOUR,
        "M":MINUTE,
        "S":SECOND
    }
    function handler() {
        
        var input = document.querySelector("#input").value;
        var unit = MS;
        if(document.querySelector("#radio_unit_30").checked){
            unit = 30n;
        }else if(document.querySelector("#radio_unit_60").checked){
            unit = 60n;
        }
        var results = calc(input, unit);
        document.querySelector("#output").value = results[0];
        document.querySelector("#error").value = results[1];
        if(window.location.search === "?debug"){
            console.log("Calculate Done");
        }
    }
    function calc(input /* string */, unit /* bigint */) /* [string, string] */{
        if(input === ""){
            return ["", ""];
        }
        //tokenize
        var tokens = tokenize(input);
        var parsed = parse(tokens);
        var computations = parsed[0];
        var errors = parsed[1];
        //convert
        var answers = compute(computations, unit);
        var answerStrings = answers.map(function(answer){
            if (typeof answer === "bigint"){
                return toString(answer);
            }
            runtimeAssert(typeof answer === "string", "Answer is not string");
            return answer;
        });
        return [answerStrings.join(",\n"), errors.join(",\n")];
        
    }
    function tokenize(input /* string */) /* string[] */ {
        var tokens = [];
        var str = input;
        var regex = /[\+\-,DdHhMmSs]/
        var j = str.search(regex);
        while(j !== -1){
            if(j!==0){
                //Prevent empty tokens
                tokens.push(str.substring(0, j));
            }
            
            tokens.push(str[j]);
            str = str.substring(j+1);
            j = str.search(regex);
        }
        if(str !== ""){
            tokens.push(str);
        }
        return tokens.map(t=>t.replaceAll(/\s/g,"")).filter(t=>t.length>0);
    }

    function parse(tokens /* string[] */) /* [(ms[]|"ERROR")[], string[]] */ {
        var computations = [];
        var current = [];
        var errors = [];
        var number = undefined;
        var value = undefined;
        var panic = false;
        var expectLookAhead /* N=Number, U=Delimiter or Unit, D=Delimiter or Number */= "N"; 
        var negative = false;


        // Grammar
        // Computations => Expression MoreComputation
        // MoreComputation => , Expression | epsilon
        // Expression => Time Unit MoreExpression
        // MoreExpression => + Expression | epsilon
        // Time => [0-9]+
        // Unit => [DHMS]
        for(var i=0;i<tokens.length;i++){
            var t = tokens[i];
            var tupper = t.toUpperCase();
            if(panic && t!==","){
                continue;
            }

            if(panic){
                expectLookAhead = "N";
                number = undefined;
                value = undefined;
                current = [];
                panic = false;
                negative = false;
            }
            
            if(t === "," || t === "+" || t === "-"){
                if(expectLookAhead !== "D" && expectLookAhead !== "U"){
                    errors.push("Unexpected \""+t+"\", did you forget to put a time before?");
                    computations.push("ERROR!");
                    panic = true;
                }else{
                    if(t===","){
                        if(number !== undefined){
                            if(value !== undefined){
                                number += value;
                            }
                            if(negative){
                                number = -number;
                            }
                            current.push(number);
                            number = undefined;
                            value = undefined;
                        }
                        computations.push(current);
                        current=[];
                        negative = false;
                    }else{
                        if(number === undefined){
                            number = 0n;
                        }
                        if(value !== undefined){
                            number += value;
                        }
                        if(negative){
                            number = -number;
                        }
                        current.push(number);
                        number = undefined;
                        value = undefined;
                        negative = t==="-";
                    }
                    expectLookAhead = "N";
                }
                
            }else if(tupper === "D" || tupper === "H" || tupper === "M" || tupper === "S"){
                if(expectLookAhead !== "U"){
                    errors.push("Unexpected \""+t+"\". Expecting a unit or delimiter");
                    computations.push("ERROR!");
                    panic = true;
                }else{
                    runtimeAssert(value !== undefined, "Value is undefined");
                    if(number === undefined){
                        number = 0n;
                    }
                    number = number + value*unitMap[tupper];
                    expectLookAhead = "D";
                    value = undefined;
                }
            }else{
                if(expectLookAhead !== "N" && expectLookAhead !== "D"){
                    errors.push("Unexpected \""+t+"\". Expecting a number");
                    computations.push("ERROR!");
                    panic = true;
                }else{
                    var regex = /^[0-9]+$/;
                    if(!regex.test(t)){
                        errors.push("\""+t+"\" is not a valid time value");
                        computations.push("ERROR!");
                        panic = true;
                    }else{
                        runtimeAssert(value === undefined, "Value is not undefined");
                        value = BigInt(t);
                        expectLookAhead = "U";
                    }
                }
            }

        }
        if(!panic){
            if(number === undefined){
                number = 0n;
            }
            if(value !== undefined){
                number += value;
            }
            if(negative){
                number = -number;
            }
            current.push(number);
            if(current.length!==0){
                computations.push(current);
            }
        }

        
        return [computations, errors];
    }

    function compute(inputs /* (ms[]|string)[] */, unit /* bigint */) /* (ms|string)[] */{
        return inputs.map(function(input){
            if (typeof input === "string"){
                return input;
            }
            var resultInUnit = 0n;
            for(var i = 0;i<input.length;i++){
                var valueInUnit = tounit(input[i], unit);
                resultInUnit += valueInUnit;
            }
            return toms(resultInUnit, unit);
        });
    }

    function toString(ms /* ms */) /* string */ {
        var result = "";
        var negative = ms<0;
        if(negative){
            ms = -ms;
        }
        if(ms >= DAY){
            var day = ms/DAY;
            result += day+"d";
            ms -= day*DAY;
        }
        var hour = undefined;
        if(ms >= HOUR){
            hour = ms/HOUR;
            ms -= hour*HOUR;
        }else{
            if(result.length !== 0){
                hour = 0;
            }
        }
        if(hour !== undefined){
            result += prefixZero(hour, 2)+"h";
        }

        var minute = undefined;
        if(ms >= MINUTE){
            minute = ms/MINUTE;
            ms -= minute*MINUTE;
        }else{
            if(result.length !== 0){
                minute = 0;
            }
        }
        if(minute !== undefined){
            result += prefixZero(minute, 2)+"m";
        }

        var second = undefined;
        if(ms >= SECOND){
            second = ms/SECOND;
            ms -= second*SECOND;
        }else{
            if(result.length !== 0){
                second = 0;
            }
        }
        if(second !== undefined){
            result += prefixZero(second, 2)+"s";
        }

        if(ms > 0 || result.length === 0){
            result += prefixZero(ms, 3);
        }
        if(negative){
            result = "-" + result;
        }
        return result;
    }

    function prefixZero(input /* any */, length /* number */) /* string */ {
        input = ""+input;
        if(input.length < length){
            return "0".repeat(length - input.length) + input;
        }
        return input;
    }

    function runtimeAssert(thing /* boolean */, message /* string */, errors /* string[]? */) {
        if (thing !== true){
            console.error("Runtime Assertion Failed: "+message);
            if(errors){
                errors.push("(Runtime Assertion Failed)");
            }
            if(window.location.search === "?debug"){
                debugger;
            }
        }
    }

    function tounit(ms /* ms */, unit /* bigint */) /* bigint */ {
        var lo = ms*unit/MS;
        var loms = toms(lo, unit);
        var hims;
        var hi;
        if(loms <= ms){
            hi=lo+1n;
            hims = toms(hi, unit);
        }else{
            hims = loms;
            hi = lo;
            lo = lo-1n;
            loms = toms(lo, unit);
        }
        // Manual rounding
        if(hims - ms > ms - loms){
            return lo
        }
        return hi;
    }
    function toms(input /* bigint */, unit /* bigint */) /* ms */ {
        var rounding = input<0?-5n:5n;
        return ((input*10n*MS)/unit+rounding)/10n;
    }
    
    function test(){
        // Test 30 FPS
        var frame = 0n;
        var adds = [33n,34n,33n];
        for(var ms=0n;ms<1000n;){
            for(var i=0;i<adds.length;i++){
                if(tounit(ms, 30n) !== frame){
                    console.error("Test failed for frame "+frame+". tounit="+tounit(ms, 30n));
                }
                if(toms(frame, 30n) !== ms){
                    console.error("Test failed for frame "+frame+". toms="+toms(frame, 30n));
                }
                ms+=adds[i];
                frame++;
            }
        }
        console.log("Test Done");
    }

    test();

    return {handler, calc};

})();
