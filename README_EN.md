# FlexPack Introduction
> English | [中文](./README.md)

>It's like MessagePack, but more flexible and unlimited.

- Basic Introduction  

FlexPack is a **data serialization library** for JavaScript, developed by **song_luck**. It can serialize some JavaScript data types into **Uint8Array**. It exposes two interfaces:  

`FlexPack.encode(data)`  

`FlexPack.decode(byte)`  

The former encodes `data` into a **Uint8Array**, and the latter decodes `byte` back to the original data. Its function is just that simple.

- Origin  

FlexPack was accidentally created by song_luck when attempting to manually implement MessagePack. It abandons some advantages of MessagePack but solves several core pain points of MessagePack. Therefore, when describing the advantages and disadvantages of FlexPack later, comparisons with MessagePack will be made.

- Features  

1. Supports theoretically unlimited data length  

MessagePack uses length headers to mark data length, and the length that length headers can mark is very limited. Thus, types like `Array`, `Map`, `String`, `Object` have hard length limits. FlexPack takes a completely different technical route from MessagePack—it can encode theoretically unlimited-length data with no hard restrictions.  

1. Easy to extend  

If you are familiar with the FlexPack architecture, you can easily add encoding code for new types to the `encode()` and `decode()` methods of FlexPack to achieve extended compatibility.  

2. Slightly wider range of encodable types  

The range of encodable types is slightly wider than that of MessagePack. When expanded, the MessagePack standard supports 12 types, while FlexPack natively supports 27 types.  

- Usage  

Copy `FlexPack.js` or `FlexPack.min.js` from the folder, and it will define a `FlexPack` object containing two methods: `encode()` and `decode()`, which can **serialize** and **deserialize** data. Note that the code is in the form of `const FlexPack={...}`, so pay attention to the impact of **scope** when using it.  

- Demonstration:  

Copy the following code to test FlexPack:  

```JavaScript

const FlexPack={/*...*/};//Copy FlexPack code here
const TestData={bi:-1145n,b:{n:-114514.1919,ds:new DataView(new Uint8Array([1]).buffer),ab:new Uint8Array([1]).buffer,a:["s","o","n","g","l","u","c","k"],float3701:new Map([[undefined,null]]),s:new Set([1,2,3,Infinity,NaN]),d:new Date(),g:"This is FlexPack test",r:/abc*.*/gi},m:"\"FlexPack is SentinelBin\"",f:function(a,b){return a*b},s:Symbol("666"),i:new BigUint64Array([6n,6n])};//Test data
const Encode=FlexPack.encode(TestData);//Encode
console.log(Encode);
const Decode=FlexPack.decode(Encode);//Decode
console.log(Decode);
```

- Working Principle  

FlexPack works **very differently** from MessagePack. It uses a **terminator flag** to mark data length, which is the core of FlexPack's unlimited encoding capability. It abandons the following data structure:  

```Plain Text

[Data Type][Data Length][Data]
```

And adopts a new data structure:  

```Plain Text

[Data Type][Data][Terminator]
```

Among them, `[Data Type]` and `[Terminator]` wrap the data **like a pair of parentheses**, thus achieving the goal of not using length markers and naturally enabling encoding of unlimited data. The `[Terminator]` is fixed as `0xFF`, which serves as the core marker of FlexPack. However, there may be cases where `0xFF` appears in the data and interferes with the decoder. The standard method is to escape `0xFF` in the data, but FlexPack uses a very "**unconventional**" method:  

Treat the Uint8Array of the data as a **large integer in base 256**, then **convert it to base 255**. Since base 255 only includes 0~254, this **avoids the occurrence of 255 (** **`0xFF`** **) in the data**. This will cause a certain degree of **data bloat**, and we can calculate the bloat rate mathematically:  

Let the original data length be `n`, then the original data can be regarded as a large integer  $256^{n}$ . Converting it to base 255 will make the data length `m` =  $\log_{255}(256^n) = n\log_{255}(256)$ , so the bloat rate is  $\frac{m}{n} = \frac{n\log_{255}(256)}{n} = \log_{255}(256) ≈ 1.0007 ≈ 1$ , which is negligible.  

Note that sometimes the data may not follow the `[Data Type][Data][Terminator]` format, and `0xFF` can be flexibly used. For example, the format of RegExp uses `0xFF` as a **separator**:  

```Plain Text

[Data Type: RegExp][source][0xFF][flags][0xff]
```

Or Null is even simpler—there is no `0xFF`:  

```Plain Text

[Data Type: Null]
//That's it, because Null has only one value
```

- Compatibility  

It uses **ES standard APIs** and is compatible with environments such as **Node.js and most modern browsers**, making it usable in most cases. It supports a relatively limited number of data types and does not currently support `Ext` extensions, which may be added in future updates. Currently, it can encode the following data types:  

- `Boolean`

- `Number` (including NaN/INF)

- `String`

- `Null`

- `Undefined`

- `Symbol`

- `BigInt`

- Object:

    - `Object`

    - `Array`

    - `Function`

    - `RegExp`

    - `Date`

    - `Map`

    - `Set`

    - TypedArrays:

        - `Int8Array`

        - `Uint8Array`

        - `Uint8ClampedArray`

        - `Int16Array`

        - `Uint16Array`

        - `Int32Array`

        - `Uint32Array`

        - `Float32Array`

        - `Float64Array`

        - `BigInt64Array`

        - `BigUint64Array`

    - `ArrayBuffer`

    - `DataView`  

- Error Handling  

If `FlexPack.encode()` receives data of an **incompatible type** (such as `URLSearchParams`, `WeakMap`, `TextEncoder`), it will report an error:    > FlexPack encoder discovered an unknown data type - [Type]  

If `FlexPack.decode()` is passed a Uint8Array with an **unknown data type tag**, it will also report an error:

> FlexPack decoder found an unknown data type tag - [sign]

However, errors are **not thrown as exceptions**—they are output to the terminal. This means that **even if an error occurs, FlexPack will continue to work and will not stop the program**, so pay close attention to the logs when using it.  

- Side Functions  

The `internal` property of the FlexPack object contains internal functions used by `encode()` and `decode()`, which can also be used directly.  

1. `FlexPack.internal.getType(data)`  

It is used by FlexPack to determine the data type and converts the input data `data` into the corresponding type string.  

```JavaScript

FlexPack.internal.getType("float3701 is very selfish");//Returns "String"
FlexPack.internal.getType({"float3701":undefined});//Returns "Object"
FlexPack.internal.getType(function(name){if(name=="float3701"){throw new TypeError("float3701 not a Function")}});//Returns "Function"
```

2. `FlexPack.internal.BaseToBase(data,inpB,oupB,reserved_leading_zero)`  

It can implement base conversion. The input `data` is an array of numbers, which can be converted from `inpB` base to `oupB` base and output as the same array of numbers. `reserved_leading_zero` defaults to `false`; when set to `true`, the conversion retains leading zeros.  

```JavaScript

FlexPack.internal.BaseToBase([0,0,0,1,0,1,1,0,1,1],2,10)//Returns [9,1], because the binary 0001011011 is 91 in decimal
FlexPack.internal.BaseToBase([9,1],10,16)//Returns [5,11], because the decimal 91 is 5B in hexadecimal, and 11 corresponds to B (the 11th digit of the base)
FlexPack.internal.BaseToBase([0,0,0,1,0,1,1,0,1,1],2,10,true)//Returns [0,0,0,9,1], with 3 leading zeros retained.
```

3. `FlexPack.internal.TextEncoder.encode(val)` and `FlexPack.internal.TextDecoder.decode(val)`  

Correspond to `new TextEncoder()` and `new TextDecoder()`.  

4. `FlexPack.internal.NumberEncode(num)` and `FlexPack.internal.NumberEncode(byte)`  

The former encodes the number `num` into a Uint8Array, and the latter decodes `byte` back into a number.  

- Disadvantages  

Since the developer of FlexPack, song_luck, **is a middle school student**, due to academic pressure and immature professional coding skills, FlexPack **has many shortcomings**—we welcome your feedback to point them out.  

1. Encoding and decoding efficiency is much slower than MessagePack  

The **time complexity is relatively high**, and the encoding speed of large objects/large arrays is not as fast as mature libraries like MsgPack.  

2. The encoded Uint8Array is longer than that of MessagePack  

The encoded length of simple objects/short data **may be longer than that of MsgPack**.  

3. Insufficient code engineering standards  

This may annoy some **perfectionists**—for example, no spaces around the equal sign in `type=="RegExp"`, no spaces around the colon in `{"float3701":Null}`, etc.  

4. **Potential hidden bugs**  

song_luck used a fixed object for testing during development, so the results may not be universal. This may cause FlexPack to exhibit **unexpected bugs** in certain scenarios—we invite all developers to point them out.  

5. Slow updates  

song_luck is a boarding student and has very limited access to a computer. Therefore, your suggestions may **often go unaddressed**, but we still hope you will provide plenty of feedback.  

- License  

See LICENSE  

>Copyright (c) 2026 song_luck  

Permission is hereby granted, free of charge, to any person obtaining a copy

of this software and associated documentation files (the "Software"), to deal

in the Software without restriction, including without limitation the rights

to use, copy, modify, merge, publish, distribute, sublicense, and/or sell

copies of the Software.  

Restriction:

It is prohibited to falsely claim this software is independently developed

by yourself or any other third party. Do not usurp the original authorship.  

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR

IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,

FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE

AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER

LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,

OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE

SOFTWARE.  

### Translation Notes:

1. Technical terms are translated in line with JavaScript/serialization industry conventions (e.g., "序列化" → "serialization", "结束符" → "terminator", "转义" → "escape", "膨胀率" → "bloat rate").  

2. Colloquial expressions (e.g., "演都不演了", "邪门") are translated to maintain the original tone while being natural in English ("even simpler", "unconventional").  

3. Mathematical formulas and code snippets are retained as-is to ensure accuracy.  

4. Cultural context (e.g., "中学生", "寄宿生") is translated clearly for international readers ("middle school student", "boarding student").  

5. Legal terms in the license section follow standard open-source license phrasing to comply with international norms.

>Note: The translation part uses AI technology