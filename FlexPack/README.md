# FlexPack介绍
> It's like MessagePack, but more flexible and unlimited.
- 基础介绍  
FlexPack是一个JavaScript的**数据序列化库**，由**song_luck**开发，它可以用来将JS部分类型数据序列化成**Unit8Array**。它暴露了两个接口：  
`FlexPack.encode(data)`  
`FlexPack.decode(byte)`  
前者可以将`data`编码成**Unit8Array**，后者可以把`byte`解码回去。作用就这么简单。
- 来历  
FlexPack是song_luck在试图手动实现MessagePack时意外手搓出来的一个序列化库，它舍弃了MessagePack的一些优点，换来了MessagePack做不到的功能。因此后面叙述FlexPack优缺点时会与MessagePack比较。
- 特点  
1. 支持理论无限数据长度  
MessagePack因为以长度头标记数据长度，长度头能标记的数据长度很有限，所以像`Array`、`Map`、`String`、`Object`等类型有长度硬限制，FlexPack与MessagePack走了两条截然不同的技术路线，它可以编码理论无限长的数据，无硬性限制。
2. 容易扩展
如果你熟悉FlexPack架构，可以轻松在FlexPack的`encode()`、`decode`代码中加入新类型的编码代码，实现扩展兼容。
3. 可编码类型稍广
可编码类型比MessagePack稍微广一些，类型展开后MessagePack标准支持12种，FlexPack标准支持27种。
- 使用方法  
将文件夹中的`FlexPack.js`或`FlexPack.min.js`复制下来，它就会定义一个`FlexPack`对象，里面有`encode()`与`decode()`两个方法，可对数据进行**序列化**和**反序列化**。注意代码是`const FlexPack={...}`形式，使用时注意**作用域**的影响。
- 演示： 
复制以下代码可进行FlexPack的测试：  
```javascript
const FlexPack={/*...*/};//此行复制FlexPack代码
const TestData={bi:-1145n,b:{n:-114514.1919,ds:new DataView(new Uint8Array([1]).buffer),ab:new Uint8Array([1]).buffer,a:["s","o","n","g","l","u","c","k"],float3701:new Map([[undefined,null]]),s:new Set([1,2,3,Infinity,NaN]),d:new Date(),g:"This is FlexPack test",r:/abc*.*/gi},m:"\"FlexPack is SentinelBin\"",f:function(a,b){return a*b},s:Symbol("666"),i:new BigUint64Array([6n,6n])};//测试数据
const Encode=FlexPack.encode(TestData);//编码
console.log(Encode);
const Decode=FlexPack.decode(Encode);//解码
console.log(Decode);
```
- 工作原理  
FlexPack工作方式与MessagePack**大不相同**，它使用**标记结束位**标记数据长度，这是FlexPack**无限编码的核心**。它摒弃了以下数据结构：
```plaintext
[数据类型][数据长度][数据]
```
使用了新的数据结构：
```plaintext
[数据类型][数据][结束符]
```
其中`[数据类型]`与`[结束符]`**像一对括号一样**包裹住数据，以此达到不用长度标记的目的，自然就可以编码无限数据。其中`[结束符]`固定为`0xFF`，它作为FlexPack的核心标记。但是现在可能会出现数据中出现`0xFF`的情况干扰解码器工作，标准方法是对数据中的`0xFF`进行转义，但是FlexPack用了一个非常“**邪门**”的方法：  
把数据的Unit8Array当成一个**256进制的大整数**，然后**转换成255进制**，因为255进制只有0~254，所以**避免了数据出现255`0xFF`的情况**。这会带来一定程度的**数据膨胀**，我们可以用数学计算膨胀率：  
设原始数据长度为`n`，那么原始数据可看成一个大整数 $256^{n}$ ,转成255进制的操作会使数据长度变为`m`$=\log_{255}(256^n)=n\log_{255}(256)$，于是膨胀率为 $\frac{m}{n}=\frac{n\log_{255}(256)}{n}=\log_{255}(256)\approx1.0007\approx1$，可忽略不计。  
需注意有时候数据并不一定是`[数据类型][数据][结束符]`的形式，`0xFF`可灵活运用，如RegExp的格式就让`0xFF`起到**分隔符**的作用：
```plaintext
[数据类型：RegExp][source][0xFF][flags][0xff]
```
或者Null**演都不演了**，没有`0xFF`:
```plaintext
[数据类型：Null]
//没了，因为Null只有一个值
```
- 兼容性  
它使用**ES标准API**，兼容**Node.js和大部分现代浏览器**等环境，可在大多数时候使用。它支持的数据类型有点少，目前并不支持`Ext`扩展，以后更新可能加入。它目前仅可以编码以下数据类型： 
  - `Boolean`
  - `Number`（包括NaN/INF）
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
- 关于报错  
如果`FlexPack.encode()`输入了**不兼容数据类型的数据**（如`URLSearchParams`、`WeakMap`，`TextEncoder`）那么它会报错：  
    > FlexPack encoder discovered an unknown data type - [Type]  
    
    如果`FlexPack.decode()`传入的Unit8Array**出现了未知数据标记**，它也会报错：
    > FlexPack decoder found an unknown data type tag - [sign]

    但是报错**并不是以抛出形式**呈现的，它会输出在终端上，这意味着**即使报错FlexPack仍会继续工作，不会使程序停下来**，所以使用时多关注日志。
 - 缺点  
因为FlexPack开发者song_luck**是一个中学生**，所以**迫于学业压力和不成熟的代码专业才能**，FlexPack**有许多缺点**，望多多指出。
1. 编码解码效率比MessagePack慢许多  
**时间复杂度较高**，大对象 / 大数组编码速度不如 MsgPack 等成熟库。
2. 编码生成的Unit8Array相比MessagePack偏长  
简单对象 / 短数据的编码长度**可能比 MsgPack 长**。
3. 代码工程规范不足  
这可能会让一些**强迫症难受一整天**，比如`type=="RegExp"`等号前后不加空格、`{"float3701":Null}`冒号前后不加空格等
4. **可能有隐藏Bug**  
song_luck测试时固定使用一个对象测试，可能结果不具有普适性，这会导致FlexPack在某些场景**表现出一些意想不到的Bug**，还请各位大佬多多提出。
5.更新慢  
song_luck是寄宿生，能碰电脑的随机很短，所以大家的意见可能**经常会得不到处理**，不过也希望大家多多提出意见。
 - 协议  
参见LICENSE
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
