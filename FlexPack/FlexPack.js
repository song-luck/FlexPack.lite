const FlexPack={
    internal:{
        TypeArrays:["Int8Array","Uint8Array","Uint8ClampedArray","Int16Array","Uint16Array","Int32Array","Uint32Array","Float32Array","Float64Array","BigInt64Array","BigUint64Array"],
        TypeArrays_byte:[1,1,1,2,2,4,4,4,8,8,8],
        getType:function(data){
            return Object.prototype.toString.call(data).slice(8, -1);
        },
        BaseToBase:function(data=[0],inpB=2,oupB=10,reserved_leading_zero=false){
            data=[...data];
            let result=[];
            let number=0n;
            let leading_zero=0;
            if(reserved_leading_zero){
              while(data[0]==0){
                    data.shift();
                    leading_zero++;
                };
            };
            for(let num=0;num<data.length;num++){
              number*=BigInt(inpB);
              number+=BigInt(data[num]);
            }
            while(number!==0n){
              result.unshift(number%BigInt(oupB));
              number=(number-result[0])/BigInt(oupB);
              result[0]=Number(result[0]);
            }
            if(reserved_leading_zero){
                while(leading_zero>=1){
                    result.unshift(0);
                    leading_zero--;
                };
            };
            return result;
            },
        TextEncoder:new TextEncoder(),
        TextDecoder:new TextDecoder(),
        NumberEncode:function(num){
            if (Number.isInteger(num)) {
                const bytes = [];
                let n = num < 0 ? (num * -2 - 1) : num * 2;
                do {
                let b = n & 0x7F;
                n >>>= 7;
                if (n > 0) b |= 0x80;
                bytes.push(b);
            } while (n > 0);
            return new Uint8Array(bytes);
            };
            const buf = new ArrayBuffer(8);
            new DataView(buf).setFloat64(0, num, false);
            const bytes = new Uint8Array(buf);
            return bytes;
          },
        NumberDecode:function(bytes) {
            if (bytes.length <= 8 && bytes.every(b => (b & 0x80) !== 0 || bytes.indexOf(b) === bytes.length-1)) {
                let n = 0, shift = 0, i = 0;
                while (i < bytes.length) {
                const b = bytes[i++];
                n |= (b & 0x7F) << shift;
                shift += 7;
                if (!(b & 0x80)) break;
            };
            return n & 1 ? -(n >>> 1) - 1 : n >>> 1;
            };          
            const originalBytes = bytes;
            return new DataView(originalBytes.buffer).getFloat64(0, false);
          }
    },
    encode:function(data){
        let output=[];
        function helper(val){
            const type=this.internal.getType(val);
            let array;
            if (type=="Object"){
                output.push(1);
                for(const key in val){
                    if(val.hasOwnProperty(key)){
                        helper.call(this,key);
                        helper.call(this,val[key]);
                    }
                };
                output.push(255);
            }
            else if(type=="Array"){
                output.push(2);
                for(const i of val){
                    helper.call(this,i);
                };
                output.push(255);
            }
            else if(type=="Boolean"){
                if(val){
                    output.push(3);
                }
                else{
                    output.push(4);
                };
            }
            else if(type=="String"){
                output.push(5);
                array=this.internal.TextEncoder.encode(val);
                array=Array.from(array);
                array=this.internal.BaseToBase(array,256,255,true);
                output.push(...array);
                output.push(255);
            }
            else if(type=="Number"){
                output.push(6);
                array=this.internal.NumberEncode(val);
                array=Array.from(array);
                array=this.internal.BaseToBase(array,256,255,true);
                output.push(...array);
                output.push(255);
            }
            else if(type=="Null"){
                output.push(7);
            }
            else if(type=="Undefined"){
                output.push(8);
            }
            else if(type=="Function"){
                output.push(9);
                array=this.internal.TextEncoder.encode(val.toString());
                array=Array.from(array);
                array=this.internal.BaseToBase(array,256,255,true);
                output.push(...array);
                output.push(255);
            }
            else if(type=="Symbol"){
                const symbol_key=Symbol.keyFor(val)
                if(symbol_key==undefined){
                    output.push(10);
                }
                else{
                    output.push(11);
                };
                array=this.internal.TextEncoder.encode(val.toString().slice(7,-1));
                array=Array.from(array);
                array=this.internal.BaseToBase(array,256,255,true);
                output.push(...array);
                output.push(255);
            }
            else if(type=="RegExp"){
                output.push(12);
                array=this.internal.TextEncoder.encode(val.source);
                array=Array.from(array);
                array=this.internal.BaseToBase(array,256,255,true);
                output.push(...array);
                output.push(255);
                array=this.internal.TextEncoder.encode(val.flags);
                array=Array.from(array);
                array=this.internal.BaseToBase(array,256,255,true);
                output.push(...array);
                output.push(255);
            }
            else if(type=="Date"){
                output.push(13);
                array=String(val.getTime()).split('').map(Number);
                array=this.internal.BaseToBase(array,10,255);
                output.push(...array);
                output.push(255);
            }
            else if(type=="Map"){
                output.push(14);
                for(const [key, value] of val.entries()){
                    helper.call(this,key);
                    helper.call(this,value);
                };
                output.push(255);
            }
            else if(type=="Set"){
                output.push(15);
                for(const i of val){
                    helper.call(this,i);
                };
                output.push(255);
            }
            else if(this.internal.TypeArrays.includes(type)){
                output.push(this.internal.TypeArrays.indexOf(type)+16);
                array = new Uint8Array(val.buffer, val.byteOffset, val.byteLength);
                array=Array.from(array);
                array=this.internal.BaseToBase(array,256,255,true);
                output.push(...array);
                output.push(255);
            }
            else if(type=="ArrayBuffer"){
                output.push(27);
                array = new Uint8Array(val);
                array=Array.from(array);
                array=this.internal.BaseToBase(array,256,255,true);
                output.push(...array);
                output.push(255);
            }
            else if(type=="DataView"){
                output.push(28);
                array = new Uint8Array(val.buffer);
                array=Array.from(array);
                array=this.internal.BaseToBase(array,256,255,true);
                output.push(...array);
                output.push(255);
            }
            else if(type=="BigInt"){
                output.push(29);
                array=[];
                let BigInt=val.toString().split('')
                if(BigInt.shift()=="-"){
                    array.push(1);
                }
                else{
                    array.push(0);
                };
                BigInt=this.internal.BaseToBase(BigInt.map(Number),10,2);
                array.push(...BigInt);
                array=this.internal.BaseToBase(array,2,255,true);
                output.push(...array);
                output.push(255);
            }
            else{
                output.push(0);
                if(type=="WeakMap"){
                    console.error(TypeError("WeakMap is still too stingy and doesn't allow FlexPack to encode =("));
                }
                else if(type=="WeacSet"){
                    console.error(new TypeError("WeakSet is still too stingy and doesn't allow FlexPack to encode =("));
                }
                else{
                    console.error(new TypeError("FlexPack encoder discovered an unknown data type - "+type));
                };
            }
        };
        helper.call(this,data);
        return new Uint8Array(output);
    },
    decode:function(data){
        let stack=Array.from(data);
        function helper(){
            const type=stack.shift();
            let output;
            if(type==0){
                output=new TypeError("FlexPack decoder discovered an unknown data type");
            }
            else if(type==1){                                         //Object
                output={};
                while(stack.length>0 && stack[0]!=255){
                    const key=helper.call(this);
                    const value=helper.call(this);
                    output[key]=value;
                };
                stack.shift();
            }
            else if(type==2){                                    //Array
                output=[];
                while(stack.length>0 && stack[0]!=255){
                    output.push(helper.call(this));
                };
                stack.shift();
            }
            else if(type==3){                                    //Boolen true
                output=true
            }
            else if(type==4){                                    //boolen false
                output=false
            }
            else if(type==5){                                    //String
                output=[];
                while(stack.length>0 && stack[0]!=255){
                    output.push(stack.shift());
                };
                stack.shift();
                output=this.internal.BaseToBase(output,255,256,true);
                output=new Uint8Array(output);
                output=this.internal.TextDecoder.decode(output);
            }
            else if(type==6){                                    //Number
                output=[];
                while(stack.length>0 && stack[0]!=255){
                    output.push(stack.shift());
                };
                stack.shift();
                output=this.internal.BaseToBase(output,255,256,true);
                output=new Uint8Array(output);
                output=this.internal.NumberDecode(output);
            }
            else if(type==7){                                    //Null
                output=null;
            }
            else if(type==8){                                    //Undefined
                output=undefined;
            }
            else if(type==9){                                    //Function
                output=[];
                while(stack.length>0 && stack[0]!=255){
                    output.push(stack.shift());
                };
                stack.shift();
                output=this.internal.BaseToBase(output,255,256,true);
                output=new Uint8Array(output);
                output=new Function("return "+this.internal.TextDecoder.decode(output))();
            }
            else if(type==10){                                    //Symbol.for
                output=[];
                while(stack.length>0 && stack[0]!=255){
                    output.push(stack.shift());
                };
                stack.shift();
                output=this.internal.BaseToBase(output,255,256,true);
                output=new Uint8Array(output);
                output=Symbol.for(this.internal.TextDecoder.decode(output));
            }
            else if(type==11){                                    //Symbol
                output=[];
                while(stack.length>0 && stack[0]!=255){
                    output.push(stack.shift());
                };
                stack.shift();
                output=this.internal.BaseToBase(output,255,256,true);
                output=new Uint8Array(output);
                output=Symbol(this.internal.TextDecoder.decode(output));
            }
            else if(type==12){                                    //RegExp
                let source=[];
                while(stack.length>0 && stack[0]!=255){
                    source.push(stack.shift());
                };
                stack.shift();
                source=this.internal.BaseToBase(source,255,256,true);
                source=new Uint8Array(source);
                source=this.internal.TextDecoder.decode(source);
                let flags=[];
                while(stack.length>0 && stack[0]!=255){
                    flags.push(stack.shift());
                };
                stack.shift();
                flags=this.internal.BaseToBase(flags,255,256,true);
                flags=new Uint8Array(flags);
                flags=this.internal.TextDecoder.decode(flags);
                output=new RegExp(source,flags);
            }
            else if(type==13){                                    //Date
                output=[];
                while(stack.length>0 && stack[0]!=255){
                    output.push(stack.shift());
                };
                stack.shift();
                output=this.internal.BaseToBase(output,255,10);
                output=Number(output.join(''))
                output=new Date(output);
            }
            else if(type==14){                                    //Map
                output=new Map();
                while(stack.length>0 && stack[0]!=255){
                    const key=helper.call(this);
                    const value=helper.call(this);
                    output.set(key,value);
                };
                stack.shift();
            }
            else if(type==15){                                    //Set
                output=[];
                while(stack.length>0 && stack[0]!=255){
                    output.push(helper.call(this));
                };
                stack.shift();
                output=new Set(output);
            }
            else if(16<=type && type<=26){                        //TypedArrays
                output=[];
                while(stack.length>0 && stack[0]!=255){
                    output.push(stack.shift());
                };
                stack.shift();
                output=this.internal.BaseToBase(output,255,256,true);
                output=new Function("let buffer=["+output.toString()+"];buffer=new Uint8Array(buffer);return new "+this.internal.TypeArrays[type-16]+"(buffer.buffer,buffer.byteOffset,buffer.byteLength/("+this.internal.TypeArrays_byte[type-16]+"))")();
            }
            else if(type==27){                                    //ArrayBuffer
                output=[];
                while(stack.length>0 && stack[0]!=255){
                    output.push(stack.shift());
                };
                stack.shift();
                output=this.internal.BaseToBase(output,255,256,true);
                output=new Uint8Array(output);
                output=output.buffer
            }
            else if(type==28){                                    //DataView
                output=[];
                while(stack.length>0 && stack[0]!=255){
                    output.push(stack.shift());
                };
                stack.shift();
                output=this.internal.BaseToBase(output,255,256,true);
                output=new Uint8Array(output);
                output=new DataView(output.buffer);
            }
            else if(type==29){                                    //BigInt
                output=[];
                while(stack.length>0 && stack[0]!=255){
                    output.push(stack.shift());
                };
                stack.shift();
                output=this.internal.BaseToBase(output,255,2,true);
                let PAN="";
                if(output.shift()==1){
                    PAN="-";
                };
                output=this.internal.BaseToBase(output,2,10)
                output=[PAN,...output.map(String)].join('')
                output=BigInt(output);
            }
            else{
                console.error(new TypeError("FlexPack decoder found an unknown data type tag - "+type));
            }
            return output;
        };
        return helper.call(this);
    }
};