/*
 *  ADDTIME function: adds a range of cells  
 *  Example: =ADDTIME(A1:A36) 
 *
 *  SUBTIME function: subtract 2 cells
 *  Example: =SUBTIME(A1, B2)
 */

var AdderOfTime = (function(){
    var MS = BigInt(1000);
    var SECOND = MS;
    var MINUTE = BigInt(60) * SECOND;
    var HOUR = BigInt(60) * MINUTE;
    var DAY = BigInt(24) * HOUR;
    var unitMap = {
        "D":DAY,
        "H":HOUR,
        "M":MINUTE,
        "S":SECOND
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
                            number = BigInt(0);
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
                        number = BigInt(0);
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
                number = BigInt(0);
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
            var resultInUnit = BigInt(0);
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
            hi=lo+BigInt(1);
            hims = toms(hi, unit);
        }else{
            hims = loms;
            hi = lo;
            lo = lo-BigInt(1);
            loms = toms(lo, unit);
        }
        // Manual rounding
        if(hims - ms > ms - loms){
            return lo
        }
        return hi;
    }
    function toms(input /* bigint */, unit /* bigint */) /* ms */ {
        var rounding = input<0?-BigInt(5):BigInt(5);
        return ((input*BigInt(10)*MS)/unit+rounding)/BigInt(10);
    }

    return calc;

})();

// =ADDTIME(range)
function ADDTIME(times) {
  return AdderOfTime(times.map(t=>t.filter(t=>t).join("+")).filter(t=>t).join("+"), BigInt(30))[0];
}

// =SUBTIME(cell1, cell2)
function SUBTIME(time1, time2){
  return AdderOfTime(time1+"-"+time2, BigInt(30));
}
