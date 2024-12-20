---
slug: floppy
title: 有关于软盘控制器
authors: [wjc133]
tags: [x86]
---

最近阅读李忠老师的《x86汇编：从实模式到保护模式》，书中示例是读硬盘的，因为实验环境的问题，在我的程序中改成了读软盘，原封不动地使用原程序会得到如下错误：

```plain
00012936084i[HD    ] ata0-0: read sectors issued to non-disk
```

所以需要探究一下软盘如何读。

注意📢：由于这篇文章经过了多个版本的修改，所以我在这里先标注一下修改历史。

| 版本 | 内容变化 |
|-----|-------|
|24-12-05| 初始版本，主要描述了软盘控制器相关寄存器的作用，但程序没有跑通 |
|24-12-06| 使用 BIOS 中断实现了读取软盘数据，详见第 9 章 |
|24-12-18| 较为系统化的了解了DMA，并修改了部分描述错误的寄存器的作用 |
|24-12-19| 更新不使用 BIOS 中断时的读取软盘数据例程，并已成功跑通 |

## 软盘
软盘由一种薄的、柔软的磁性材料（通常是塑料片）制成，表面涂有铁氧化物或其他磁性物质。这些磁性物质能够记录数据。  
磁性材料的方向代表数据的二进制值（0或1）。  
软盘驱动器通过磁头进行读写操作，当写数据时，磁头通过电流改变磁性材料的方向，从而记录数据；当读数据时，磁头感知磁场的变化并转换为电信号，再解码为二进制数据。与硬盘类似，软盘的表面被划分为多个同心圆（称为轨道）和弧形区段（称为扇区），每个扇区存储一块数据。  
早期软盘都是单面设计，仅使用软盘的一面记录数据，对应的单磁头驱动器就只有一个磁头；后期设计出了两面都可以记录数据的软盘，对应的双面软盘驱动器通常在上下各配备一个磁头。

软驱内部有两个马达：

+ 转盘马达：驱动软盘以恒定速度旋转，通常是每分钟300转（300 RPM）
+ 步进马达：控制磁头沿径向移动，定位到目标轨道

容量取决于磁盘的大小和扇区密度，软盘因物理磨损、磁性退化等问题容易丢失数据，且存取速度较慢，因此逐渐被更先进的存储介质取代。

![](img/01.png)

### 常见的尺寸和容量一览表
| 尺寸 | 单面单密度 | 单面双密度 | 双面双密度 | 高密度 | 扩展密度 |
| --- | --- | --- | --- | --- | --- |
| **8英寸** | 80 KB | 160 KB | 320 KB | - | - |
| **5.25英寸** | 90 KB | 360 KB | 720 KB | 1.2 MB | - |
| **3.5英寸** | 360 KB | 720 KB | 1.44 MB | 2.88 MB | - |


> 备注：单密度是早期软盘的磁记录技术，采用一种简单的调制方式（通常是FM）来记录二进制数据；双密度是在单密度的基础上，通过改进磁性材料和磁头设计，增大磁道密度和扇区数。它通常采用MFM调制（Modified Frequency Modulation）来提高数据存储效率。


### 软盘的物理结构
软盘不支持像硬盘那样直接使用 LBA（逻辑块地址）模式访问扇区，因为 FDC 并没有实现类似硬盘那种高级的逻辑地址转换机制。软盘操作基于传统的 CHS（柱面-磁头-扇区）模式进行访问。

+ 磁道（Cylinder/Track）
+ 磁头（Head）
+ 扇区（Sector）

### 经典的 3.5 英寸 1.44MB 软盘
对于常见的 3.5 英寸 1.44MB 软盘：

+ 每磁道有 **18 个扇区**（扇区编号 1-18）。
+ 有 **2 个磁头**（磁头编号 0 和 1）。
+ 总共有 **80 个柱面**（柱面编号 0-79）。

### CHS 到 LBA 转换公式
给定一个逻辑块地址 LBA，转换为 CHS 参数的公式为：

+ 磁道号 ![image](img/02.svg)
+ 磁头号 ![image](img/03.svg)
+ 扇区号 ![image](img/04.svg)

> 注意：扇区编号从 1 开始，而非 0。


所以，app_lba_start 是 LBA 100，也就是：

+ 扇区号 = 100 mod 18 + 1 = 11 扇区
+ 磁头号 = (100 / 18) mod 2 = 1 头
+ 磁道号 = 100 / (2 * 18) = 2 道


## 软盘控制器概述
在 x86 架构的计算机中，可以通过特定的 I/O 端口与软盘驱动器（FDD, Floppy Disk Drive）进行通信。

软盘驱动器（FDD）通过软盘控制器（FDC）与 CPU 交互。FDC 接收 CPU 发出的命令和数据，通过控制信号驱动软盘的物理操作。

| I/O 地址 | 寄存器 | 功能说明 |
| --- | --- | --- |
| **0x3F0** | 状态控制寄存器 A | 存储软盘驱动器的当前状态。 |
| **0x3F1** | 状态控制寄存器 B | 存储一些高级状态信息。 |
| **0x3F2** | 数字输出寄存器 (DOR) | 控制驱动器选择、马达开关和复位 FDC。 |
| **0x3F4** | 主状态寄存器 (MSR) | 显示 FDC 的当前状态，指示是否可发送命令。 |
| **0x3F5** | 数据寄存器（FIFO） | 用于读写数据到软盘（命令和数据共享通道）。 |
| **0x3F7** | 控制寄存器 (DIR) | 用于控制数据速率或其他特定功能。 |


## 与 FDD 通信的步骤
#### 设置 DMA
要从软盘读取数据有两种方法，要么通过 DMA，要么不走 DMA，直接通过 CPU 搬运数据，也就是 PIO（Programmed Input/Output，程序化输入/输出）。

⚠️ 注意：我参考的 osdev 文章中提到：目前 bochs 模拟器主要是模拟了 DMA 模式，它没有办法支持纯轮询的 PIO。

软盘控制器可通过 DMA 的 2 号通道传输数据。在开始初始化软盘前，必须先初始化好 DMA 通道。具体方式方法见[有关于DMA](https://tinyfun.club/blog/dma)。

#### 初始化软盘控制器
+ **复位软盘控制器**：  
写 `0x00` 到 **DOR (0x3F2)**，然后写入 `0x1C`（开启主机和驱动器）。
+ **检查状态**：  
读取 **主状态寄存器 (MSR, 0x3F4)**，确保 FDC 准备好处理命令（状态为非忙状态）。

#### 发送命令到软盘控制器
+ **寻道**：  
通过发送寻道命令字节，控制磁头移动到指定磁道。
+ **命令字节格式**：  
根据具体操作（例如读/写磁盘、寻道），将对应的命令字节发送到 **数据寄存器 (0x3F5)**。
+ **等待状态更新**：  
再次检查 **MSR (0x3F4)**，确认数据被正确接收。

#### 数据读写
+ **写操作**：
    1. 将写命令发送到 **0x3F5**。
    2. 将要写入的数据逐字节发送到 **数据寄存器 (0x3F5)**。
+ **读操作**：
    1. 发送读命令到 **0x3F5**。
    2. 从 **数据寄存器 (0x3F5)** 逐字节读取数据。

#### 检查完成状态
+ **读取状态寄存器**：  
通过 **状态控制寄存器 (0x3F0)** 检查操作是否完成，以及是否发生错误。

#### 关闭软盘控制器
+ 最终通过写 `0x00` 到 **DOR (0x3F2)**，关闭 FDD 马达。

## 数字输出寄存器 (0x3F2, DOR, Digital Output Register)
+ **I/O 地址**：0x3F2
+ **作用**：控制软盘驱动器选择、马达开关、软盘控制器复位等功能。

| 位（bit） | 名称 | 作用 |
| --- | --- | --- |
| 0-1 | 驱动器选择位 | 指定使用哪个驱动器： <br/>00 = 驱动器 0 <br/>01 = 驱动器 1 <br/>10 = 驱动器 2 <br/>11 = 驱动器 3 |
| 2 | 复位控制位 | 1 = 正常模式；<br/>0 = 复位模式 |
| 3 | DMA位 | 1 = 允许中断请求并打开 DMA 传输（切换到程序控制 I/O 模式）； <br/>0 = 禁用 DMA |
| 4 | 驱动器 0 马达开关 | 1 = 打开驱动器 0 的马达； <br/>0 = 关闭驱动器 0 的马达。 |
| 5 | 驱动器 1 马达开关 | 1 = 打开驱动器 1 的马达； <br/>0 = 关闭驱动器 1 的马达。 |
| 6 | 驱动器 2 马达开关 | 1 = 打开驱动器 2 的马达； <br/>0 = 关闭驱动器 2 的马达。 |
| 7 | 驱动器 3 马达开关 | 1 = 打开驱动器 3 的马达； <br/>0 = 关闭驱动器 3 的马达。 |


## 主状态寄存器 (0x3F4, MSR, Main Status Register)
+ **I/O 地址**：0x3F4
+ **作用**：提供软盘控制器的运行状态和驱动器状态信息。

| 位（bit） | 名称 | 作用 |
| --- | --- | --- |
| 0 | 驱动器忙状态位 0 | 1 = 驱动器 0 正在忙； <br/>0 = 驱动器 0 空闲 |
| 1 | 驱动器忙状态位 1 | 1 = 驱动器 1 正在忙； <br/>0 = 驱动器 1 空闲 |
| 2 | 驱动器忙状态位 2 | 1 = 驱动器 2 正在忙； <br/>0 = 驱动器 2 空闲 |
| 3 | 驱动器忙状态位 3 | 1 = 驱动器 3 正在忙； <br/>0 = 驱动器 3 空闲 |
| 4 | FDC命令忙状态 | 1 = FDC 正在处理命令（如果一个命令参数分多次传入，在命令结束之前，该字段会一直保持为1）； <br/>0 = FDC 空闲，可以接收新命令 |
| 5 | NDM | 非 DMA 模式（Non-DMA Mode）：1 表示正在进行非 DMA 数据传输；0 表示 DMA 模式 |
| 6 | DIO | 数据方向（Data Input/Output）：1 表示 FDC 有数据想要发送给 CPU（从FDC视角来看就是「快来读我」）；0 表示 FDC 期望得到 CPU 的数据（从FDC视角来看就是「快给我数据」） |
| 7 | FDC控制器忙 | 1 = FDC 已经准备好在 FIFO 上传输数据； 0 = 没准备好 |


## 数据寄存器 (0x3F5)
### 命令模式
+ **写入命令流程**：
    1. 向 **0x3F5** 写入命令字节（如读扇区、写扇区、寻道等）。
    2. 后续写入多个参数字节，例如磁道号、扇区号、扇区大小等。
    3. 软盘控制器执行命令。
+ **示例：读扇区命令**  
如果需要读取软盘中的某一扇区，典型命令序列为：
    1. 写入命令字节 `0x06`（读扇区命令）。
    2. 写入参数字节：
        * 磁头号。
        * 磁道号。
        * 扇区号。
        * 每扇区大小等。

常见命令：

```c
enum FLPYDSK_CMD {
	
	FDC_CMD_READ_TRACK	=	2,
	FDC_CMD_SPECIFY		=	3,
	FDC_CMD_CHECK_STAT	=	4,
	FDC_CMD_WRITE_SECT	=	5,
	FDC_CMD_READ_SECT	=	6,
	FDC_CMD_CALIBRATE	=	7,
	FDC_CMD_CHECK_INT	=	8,
	FDC_CMD_WRITE_DEL_S	=	9,
	FDC_CMD_READ_ID_S	=	0xa,
	FDC_CMD_READ_DEL_S	=	0xc,
	FDC_CMD_FORMAT_TRACK	=	0xd,
	FDC_CMD_SEEK		=	0xf
};
```

### 数据传输模式
**读取或写入数据流程**：

1. CPU 从 **0x3F5** 读取：获取来自软盘的数据（读命令结果）。
2. CPU 向 **0x3F5** 写入：将数据发送到软盘（写命令内容）。

每次从 0x3F5 读取/写入一个字节。



在与 **0x3F5** 交互前，应检查主状态寄存器 (**MSR, 0x3F4**) ，0x80

## 例程

第一个扇区是 MBR，数据存储在 LBA 第 100 个扇区上。由于我参考的部分资料 LBA 都是从 0 开始计数的，所以我的程序也采用了 LBA 从 0 计数。如果你想和书中一样 LBA 从 1 开始计数，稍微修改一下 LBA 转物理磁道、磁头、扇区的代码就可以了。

注意：代码中更理想的情况是响应 DMA 给出的 06 号中断，但我目前还是图省事，直接给出了一个循环来模拟等待。后续可能结合保护模式再对该程序做改造。

数据输出到屏幕的过程，简单起见，我使用了 10 号中断例程。

```asm
app_lba_start equ 99
FDC_DOR         equ 0x3F2  ; 数字输出寄存器
FDC_MSR         equ 0x3F4  ; 主状态寄存器
FDC_FIFO        equ 0x3F5  ; 数据寄存器
FLPY_SECTORS_PER_TRACK equ 18
;===========================================
mov ax,0
mov ss,ax
mov sp,ax

mov ax, cs
add ax, 0x07c0
mov ds, ax

mov bx, msg         ; 起始位置
call put_string

; playground area

;先读取程序头部
xor di,di
mov si,app_lba_start
call read_floppy_disk_0

mov ecx, 1000000 ; 这个值根据 CPU 频率调整，模拟 1 秒
.delay:
    dec ecx
    jnz .delay          ; 循环直到 ECX 为 0
mov ax, [floppy_buffer]
mov dx, [floppy_buffer+2]
mov cx, 16
div cx
mov ds,ax
mov bx,dx
call put_string

hlt

;====================
read_floppy_disk_0:
    push ax
    push bx
    push cx
    push dx
    push ds
    push es

    ; 再计算柱面号 
    mov cx,FLPY_SECTORS_PER_TRACK*2
    mov ax,si
    mov dx,di
    div cx
    mov [@3],al

    ; 再计算磁头号
    mov cx,FLPY_SECTORS_PER_TRACK*2
    mov ax,si
    mov dx,di
    div cx
    mov ax,dx
    xor dx,dx
    mov cx,FLPY_SECTORS_PER_TRACK
    div cx
    mov [@3+1],al

    ; 计算扇区号
    mov cx,18
    mov ax,si
    mov dx,di
    div cx
    inc dx
    mov [@3+2],dl

    ; 设置 DMA
    call setup_dma
    ; 重置软盘控制器
    call reset_floppy
    ; 读取数据
    call read_sector

    pop es
    pop ds
    pop dx
    pop cx
    pop bx
    pop ax
    ret

setup_dma:
    ; 1. 禁用 DMA 通道 2
    mov dx, 0x0A       ; DMA 主屏蔽寄存器端口
    mov al, 0x04       ; 禁用通道 2
    out dx, al

    ; 2. 设置 DMA 地址寄存器
    mov dx, 0x04       ; 通道 2 的地址寄存器
    mov ax, [floppy_buffer]     ; 数据缓冲区偏移地址（低 16 位）
    out dx, al         ; 输出低 8 位
    mov al, ah         ; 高 8 位
    out dx, al

    ; 3. 设置 DMA 页寄存器
    mov dx, 0x81       ; 通道 2 的页寄存器
    mov ax, [floppy_buffer+2] ; 数据缓冲区段地址（高 8 位段地址）      
    out dx, al

    ; 4. 设置 DMA 传输长度（计数寄存器）
    mov dx, 0x05       ; 通道 2 的计数寄存器
    mov ax, 511        ; 传输字节数减 1（512 - 1 = 511）
    out dx, al         ; 输出低 8 位
    mov al, ah         ; 高 8 位
    out dx, al

    ; 5. 设置 DMA 模式寄存器
    mov dx, 0x0B       ; DMA 模式寄存器
    mov al, 0x56       ; 通道 2，读模式，单字节传输
    out dx, al

    ; 6. 启用 DMA 通道 2
    mov dx, 0x0A       ; DMA 主屏蔽寄存器
    mov al, 0x02       ; 启用通道 2
    out dx, al

; 该设置floppy了
reset_floppy:
    ; 发送复位命令
    mov dx, FDC_DOR
    mov al, 0x00       ; 复位软盘控制器
    out dx, al
    mov al, 0x1C       ; 重新启用软盘控制器和驱动器 0
    out dx, al

        ; 等待复位完成
    call wait_floppy_ready
    ret

    ; 等待软盘控制器就绪
    wait_floppy_ready:
        mov dx, FDC_MSR
    .wait:
        in al, dx
        test al, 0x80      ; 检查主状态寄存器的忙位（第 7 位）
        jz .wait          ; 如果忙，继续等待
        ret

; ============================
; 3. 读取软盘扇区
; ============================
read_sector:
    ; 发送 READ DATA 命令到软盘控制器
    mov dx, FDC_FIFO
    mov al, 0xE6       ; 命令：读数据
    out dx, al
    mov al, [@3+1]       ; 起始头号
    shl al, 2
    or  al, 0x00
    out dx, al
    mov al, [@3]       ; 起始磁道号
    out dx, al
    mov al, [@3+1]       ; 起始头号
    out dx, al
    mov al, [@3+2]       ; 起始扇区号（第2个扇区）
    out dx, al
    mov al, 0x02       ; 每扇区 512 字节
    out dx, al
    mov al, [@3+2]
    inc al
    out dx, al
    mov al, 0x1B       ; GAP3 长度
    out dx, al
    mov al, 0xFF       ; 数据长度（无关）
    out dx, al

    ; 等待操作完成
    call wait_floppy_ready

    ret 
; playground area end

hlt

; bx = 要输出的字符
; 输出字符串
put_string:
    mov ah, 0x0e  ; 0x10的0x0e命令是输出字符到屏幕，并推进光标
    mov al, [bx]  ; al为将要显示的字符
    cmp al, 0
    jz .return
    int 0x10
    inc bx
    jmp put_string
.return:
    ret

msg: db 'x86 asm playground',0x0d,0x0a
msg_end:
floppy_buffer: dd 0x10000
@3: db 0,0,0    ; 用于存储 柱面、磁头、扇区
times 510-($-$$) db 0
db 0x55,0xaa
```

数据保存到第 100 个扇区：

```plain
db 'abcdefghijklmnopqrstuvwxyz'
```

使用 build.sh 编译并烧录：

```bash
build.sh mbr.asm 0 constants.asm 99
```

![不使用BIOS中断运行结果](./img/06.png)

## 总结
+ **DOR** 用于控制软盘驱动器的选择、马达开关以及 FDC 的使能。
+ **MSR** 提供 FDC 和驱动器的状态信息，协助同步命令和数据的传输操作。  
在实际编程中，需结合这两个寄存器配合使用，以确保软盘驱动器的正常运行和数据交换。
+ **0x3F5** 是软盘控制器的核心通信接口，用于发送命令字节或数据字节，或者获取 FDC 的执行结果、状态信息或软盘数据。

## 利用 BIOS 中断读取软盘数据
### 指令概述
BIOS 中断提供了 13 号中断处理程序，直接磁盘服务(Direct Disk Service——INT 13H)  

+ 00H — 磁盘系统复位 
+ 01H — 读取磁盘系统状态 
+ 02H — 读扇区 
+ 03H — 写扇区 
+ 04H — 检验扇区 
+ 05H — 格式化磁道 
+ 06H — 格式化坏磁道 
+ 07H — 格式化驱动器 
+ ………………

### 02H 读磁盘功能详解  
+ 入口参数：
    - AH＝02H 
    - AL＝扇区数 
    - CH＝柱面 
    - CL＝扇区 
    - DH＝磁头 
    - DL＝驱动器，00H~7FH：软盘；80H~0FFH：硬盘 
    - ES:BX＝缓冲区的地址 
+ 出口参数
    - CF＝0——操作成功时，AH＝00H，AL＝传输的扇区数
    - CF = 1，AH＝状态代码 

### 例程
```plain
TRACK equ 0
HEAD equ 0
SEC  equ 2

;=============
segment code align=16 vstart=0x7c00
; 设置段寄存器
mov ax, 0x1000     
mov ds, ax
mov es, ax ; ES寄存器指向内存0x10000区域

; 设置LBA 100扇区
mov ah, 0x02        ; BIOS中断 13h，读取扇区
mov al, 0x01        ; 读取1个扇区
mov ch, 0x00        ; 柱面号 0
mov cl, 0x02        ; 扇区号 100
mov dh, 0x00        ; 磁头号 0
mov dl, 0x00        ; 驱动器号 0 (软盘)

; 读取软盘的LBA 100扇区到内存地址0x10000
mov bx, 0x0000      ; BX指向0x0000 (0x1000:0x0000 = 0x10000)
int 0x13            ; 调用BIOS中断读取扇区

; 检查读取是否成功
jc disk_error       ; 如果载入失败，跳转到错误处理

; 显示出来
mov cx,24
mov di,0x0000
mov ax,0xb800
mov es,ax
mov bx,0x0000
@ll:
    mov al,[bx]
    mov [es:di],al
    inc di
    mov byte [es:di],0x07
    inc di
    inc bx
    loop @ll

jmp $

disk_error:
    ; 错误提示，然后进入低功耗模式
    mov ax,0xb800
    mov es,ax
    mov byte [es:0x00],"S"
    mov byte [es:0x01],0x07
    mov byte [es:0x02],"o"
    mov byte [es:0x03],0x07
    mov byte [es:0x04],"r"
    mov byte [es:0x05],0x07
    mov byte [es:0x06],"r"
    mov byte [es:0x07],0x07
    mov byte [es:0x08],"y"
    mov byte [es:0x09],0x07
    hlt                ; 进入停机状态


times 510-($-$$) db 0
db 0x55, 0xaa
```

编译后成功运行：

![](img/05.png)

## 附录：参考资料
[http://www.brokenthorn.com/Resources/OSDev20.html](http://www.brokenthorn.com/Resources/OSDev20.html)

[https://wiki.osdev.org/Floppy_Disk_Controller](https://wiki.osdev.org/Floppy_Disk_Controller)

有人在论坛提问他的程序 bochs 跑不起来，在其他虚拟机可以。其实说的就是 bochs 对 PIO 的支持不好。

[https://f.osdev.org/viewtopic.php?t=22338](https://f.osdev.org/viewtopic.php?t=22338)

