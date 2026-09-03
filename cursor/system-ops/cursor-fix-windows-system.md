# 用 Cursor Agent 修 Windows 系统：从安全中心被关到更新源被劫持

> [Cursor 推广链接](https://cursor.com/referral?code=Y3RXKKUGMJ2G)：优惠与适用条件以结账页实际显示为准。

**摘要**：一次真实的系统排障复盘。症状表面看是 Windows 安全中心空白，进一步排查发现是两条独立故障线并发：其一，Defender 被策略级关停；其二，Windows Update 被第三方 WSUS 指向并叠加 fake-ip 拦截，最终表现为更新长期失败和 `0x800f081f`。本文重点记录 Cursor Agent 如何在长上下文里自主取证、修正错误、沉淀脚本。

**关键词**：Cursor Agent、Windows 安全中心、Windows Defender、DisableAntiSpyware、SecurityHealthService、PPL、WSUS、0x800f081f、Windows Update、系统排障

---

<a id="cause"></a>
## 起因：不是“突然坏了”，而是长期配置漂移
机器环境是 Windows 10 Education 21H2。出问题那天，Windows 安全中心整个面板空白，“病毒和威胁防护”“防火墙和网络保护”都点不开；但 `netsh advfirewall` 还能正常返回，说明网络栈和规则本身并未完全损坏。

我最初判断是“系统老化 + 组件异常”，准备重装。后来想到这类问题通常不是单点故障，而是某些软件长期改策略造成的“配置漂移”。这次决定换一条路：不先重装，先让 Cursor Agent 接管读信息、建假设、做证伪。

为了降低风险，我在这次会话中主动约定：只读诊断可以执行，写入动作由我在管理员终端手动执行并回传结果。这是本次人工协作规则，不是 Cursor 对所有“只读/写入”命令的固定审批保证。

<a id="cause-contract"></a>
### 排障前先约定“协作协议”
我给 Agent 的协议分三条，这三条后来证明很有用：

1. **目标导向，不给路径**：只给“要修到什么状态”，不提前限定命令，避免把自己的先入为主灌进去。  
2. **写入分级**：改注册表、改服务、停系统服务都属于高风险，必须先给解释，再人工执行；同时检查当前 Run Mode 与审批提示。
3. **每轮都要复查**：任何“看起来修好了”的结论，都要有状态命令佐证，不能靠 UI 直觉。

这套协议避免了两个常见失误：一是 AI 直接给“看似合理但不可执行”的一把梭脚本；二是人类在焦虑状态下把多条命令连跑，最后不清楚到底哪一步改变了系统状态。

---

<a id="story-defender"></a>
## 故事线 1：Defender 与安全中心被策略级关停
<a id="defender-agent-start"></a>
### 起手：给目标，不给路径，让 Agent 自己探测
我只给了一句话：

> 这台 Win10 的安全中心面板空白，防火墙规则看起来还在。请你直接排查根因；只读命令可以自己执行，写入动作先给方案。

Agent 第一轮就跑了关键链路：

```text
Get-Service wscsvc, mpssvc, BFE, WinDefend, WdNisSvc, SecurityHealthService
reg query "HKLM\SOFTWARE\Policies\Microsoft\Windows Defender" /s
gpresult /scope:computer /r | Select-String -Pattern "Windows Defender"
Get-MpThreatDetection | Select ThreatName, Resources, InitialDetectionTime
```

它很快给出三个核心证据：

1. `WinDefend` 与 `SecurityHealthService` 都是 `Disabled`
2. `HKLM\SOFTWARE\Policies\Microsoft\Windows Defender` 下存在 `DisableAntiSpyware=1`
3. Defender 历史里出现 `VirTool:Win32/DefenderTamperingRestore`

这三个点一起出现时，结论基本成立：不是临时服务崩溃，而是被策略层持续压制。更关键的是，`VirTool:Win32/DefenderTamperingRestore` 说明 Defender 曾检测并清理过篡改，但策略又被反复写回。

<a id="pit-sc-alias"></a>
### 坑 1：`sc` 在 PowerShell 里不是你以为的那个 `sc`
Agent 早期给过一段修复命令，其中有：

```powershell
sc config WinDefend start= auto
```

我在 PowerShell 里直接执行后报错，回贴给 Agent。它没有硬解释，而是先在自己的终端复现并自证：

```text
Get-Command sc
Alias       sc -> Set-Content
Application sc.exe -> C:\Windows\system32\sc.exe
```

随后它修正为 PowerShell 原生命令：

```powershell
Set-Service -Name WinDefend -StartupType Automatic
Set-Service -Name SecurityHealthService -StartupType Manual
```

这一段非常关键：Agent 不只是“回答”，它会验证自己上一轮输出是否可执行。排障场景里，这比“给出一个看起来像答案的答案”更有价值。

<a id="pit-1058-order"></a>
### 坑 2：错误 1058 本质是执行顺序问题
下一次报错是：

```text
net start WinDefend
发生系统错误 1058。
无法启动服务，原因可能是已被禁用。
```

Agent 的处理顺序是对的：

1. 先复查当前状态（而不是直接开新药方）
2. 再回放历史命令顺序
3. 最后定位“当时是 Disabled 状态下先启动服务”

它给出的结论很朴素但重要：**先改启动类型，再启动服务**。系统排障里很多“玄学问题”最后都是顺序错误。

<a id="pit-access-denied"></a>
### 坑 3：管理员权限不等于可改安全服务
我在管理员 PowerShell 里执行：

```text
sc.exe config SecurityHealthService start= demand
[SC] ChangeServiceConfig 失败 5: 拒绝访问
```

看上去反常：已经是管理员，为什么还是拒绝？Agent 指出本质是服务控制管理器 ACL。`SecurityHealthService` 属于受保护安全服务，很多写操作只允许 `SYSTEM` 或更高保护上下文。

它给了两条路：

1. 以 `SYSTEM` 身份执行（常见用法是 PsExec）
2. 直接走注册表路径调整 `Start` 值（先处理 ACL）

<a id="pit-psexec-fakeip"></a>
### 坑 4：PsExec 走不通时，先看网络层是否“截胡”
我尝试 `SYSTEM` 路径时遇到：

```text
Error creating key file ...
找不到网络名
```

Agent 结合环境判断：这不是单纯“命令写错”，而是 PsExec 依赖的 SMB/admin$ 通道在当前网络解析链上失败。它让我绕开这条链，直接处理服务注册表键值。

服务键路径：

```text
HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\SecurityHealthService
```

`Start` 语义：

| Start 值 | 启动类型 |
| --- | --- |
| 2 | 自动（Automatic） |
| 3 | 手动（Manual） |
| 4 | 禁用（Disabled） |

将 `Start` 从 `4` 改回 `3` 后，`Get-Service` 显示启动类型已回正，但手动 `Start-Service` 依然失败。

<a id="ppl-truth"></a>
### 真相：`SecurityHealthService` 涉及 PPL 保护，正确姿势是重启触发
Agent 把我之前忽略的一点点破了：该服务与受保护进程机制（PPL）相关，很多场景并不支持你在系统运行中手动拉起。尤其在 Defender 刚从禁用态恢复后，初始化时序更依赖开机阶段触发。

换句话说，最省时间的路径是：

1. 修正策略和启动类型
2. 不死磕 `Start-Service`
3. 直接重启，让系统在正确时机拉起

重启后状态恢复：

```text
WinDefend             Running  Automatic
SecurityHealthService Running  Manual
```

安全中心 UI 同步恢复。

<a id="defender-threat-history"></a>
### 侧证：Defender 威胁历史里的“作案轨迹”
恢复后我立刻拉取历史检测：

```text
Trojan:Win32/Wacatac.B!ml
Adware:Win32/Tnega
HackTool:Win32/AutoKMS
HackTool:Win32/AutoKMS!pz
VirTool:Win32/DefenderTamperingRestore
```

这里最关键的是最后一条。它不是泛型木马名，而是 Defender 对“安全策略被篡改并尝试恢复”的专用信号，与 `DisableAntiSpyware=1` 形成闭环证据。

至于“谁写回去的”，我没有继续做进程级抓现行；对这次修复目标而言，证据已经足够支撑处置：停止可疑策略来源、恢复系统默认防护链路。

<a id="defender-four-signals"></a>
### Defender 线四个高价值判定点
这条线里最值得复用的不是具体命令，而是判定框架。以后再遇到“安全中心空白 / 防护入口失效”，我会优先看下面四个点：

| 判定点 | 看到什么 | 说明什么 |
| --- | --- | --- |
| 服务状态 | `WinDefend`、`SecurityHealthService` 被禁用 | 不像“临时故障”，更像策略级动作 |
| 策略键 | `DisableAntiSpyware=1` | Defender 被组策略语义关闭 |
| 组策略来源 | 域策略结果为空 | 大概率不是企业域下发，而是本地程序写入 |
| 历史威胁 | `VirTool:Win32/DefenderTamperingRestore` | Defender 自己检测过篡改行为 |

这四个点里，只要命中 2 个以上，就应该把排查重心从“组件损坏”切回“策略被持续写回”。

<a id="defender-min-fix-checklist"></a>
### 现场最小修复清单（Defender 线）
为了避免改动过大，我把动作压缩成“最小闭环”：

1. 回退 Defender 策略值（先从 `DisableAntiSpyware` 入手）  
2. 修复 `WinDefend` 与 `SecurityHealthService` 启动类型  
3. 不在运行态强拉 PPL 相关服务，直接重启  
4. 重启后一次性复查服务状态 + 安全中心 UI + 威胁历史

这套清单的优点是可重复、可审计、可回退。你能清晰知道每一步在改变什么，而不是执行一长串混合命令后“祈祷它恢复”。

---

<a id="story-update"></a>
## 故事线 2：Windows Update 失败不是一条根因
<a id="update-wsus-hijack"></a>
### 第一刀先查策略，不先跑大修复
Defender 线修复后两天，更新仍然失败。常见报错包括 `0x800f081f`。我原本条件反射想先跑 DISM，Agent 反过来提醒：先排“更新源被改写”。

它直接读取：

```powershell
Get-ItemProperty 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate'
Get-ItemProperty 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU'
```

命中关键字段：

```text
WUServer       : http://(第三方域名)
WUStatusServer : http://(第三方域名)
UseWUServer    : 1
```

这代表系统并未默认走微软更新源，而是被指向第三方 WSUS。

<a id="update-dual-layer"></a>
### 第二刀补证：DNS 与进程态交叉验证
只看策略还不够，Agent 又补了两条证据链：

```powershell
Resolve-DnsName <wsus-host>
Get-Process | Where-Object Name -Match 'mihomo|verge'
```

结果是 WSUS 域名解析进入 `198.18.0.0/15`，同时机器上存在接管 DNS 的代理客户端。到这里它给出的模型很清楚：

1. 策略层：更新源被改到第三方 WSUS
2. 网络层：该域名又被 fake-ip 拦截

所以你看到的是“更新全面失败”，但底层是双层叠加故障。

<a id="update-fix-seq"></a>
### 修复路径：先退策略，再按顺序重置缓存
Agent 给出的修复顺序如下：

```powershell
# 1) 移除 WSUS 策略
reg delete "HKLM\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate" /v WUServer /f
reg delete "HKLM\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate" /v WUStatusServer /f
reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU" /v UseWUServer /t REG_DWORD /d 0 /f

# 2) 重置缓存（先停服务，再改目录，最后再启动）
net stop wuauserv
net stop bits
net stop cryptsvc
net stop dosvc

Rename-Item C:\Windows\SoftwareDistribution SoftwareDistribution.old -Force
Rename-Item C:\Windows\System32\catroot2 catroot2.old -Force

net start cryptsvc
net start bits
net start wuauserv
net start dosvc
```

我中间又犯了一次顺序错：先启动服务再重命名目录，导致“访问被拒绝”。这与前面的 1058 本质一致：**脚本类运维最怕顺序颠倒**。

<a id="update-0x800f081f"></a>
### `0x800f081f`：回到组件存储缺源本体
策略回正、缓存重置后，升级过程仍出现 `0x800f081f`。这时再跑组件修复才是对时机：

```powershell
DISM /Online /Cleanup-Image /RestoreHealth
sfc /scannow
```

完成后重试更新，21H2 到 22H2 成功。

<a id="update-validation-sequence"></a>
### Update 线建议的验证顺序
这一段是我事后总结出的“先后顺序”，基本可以复用到大多数更新失败场景：

1. **策略层**：先确认是否被 WSUS 指向  
2. **解析层**：确认目标域名解析是否异常  
3. **网络层**：确认本机是否有代理接管 DNS/流量  
4. **缓存层**：按停服 → 重命名 → 起服顺序重置  
5. **组件层**：最后再执行 DISM / SFC

很多人会从第 5 步开局，结果在错误更新源上反复打转。先把策略和链路打通，再修组件，成功率会高很多。

<a id="update-safe-guards"></a>
### 重试前的保护动作
为了避免重复试错把系统越修越乱，建议每轮重试前做三件事：

- **记录当前状态快照**：把策略键、服务态、关键错误码截一份文本  
- **给目录改带时间戳的备份名**：例如 `.old.20260525`，避免第二轮冲突  
- **一次只改一类变量**：先改策略再试；仍失败再改缓存；再失败再改组件

这样做的好处是定位清晰：你知道“是哪一类动作带来了变化”，而不是所有动作混在一起。

---

<a id="diagnose-script"></a>
## 让 Agent 沉淀可复用脚本，而不是一次性对话
这次最值钱的不是“修好一次”，而是把经验固化。我让 Agent 把所有只读诊断命令整理成单脚本，分 Defender 线和 Update 线输出，并附判读提示。

骨架大致如下：

```powershell
# scripts/Diagnose-WindowsHealth.ps1

# [1/2] Defender 与安全中心
Get-Service wscsvc, mpssvc, BFE, WinDefend, WdNisSvc, SecurityHealthService
$policy = Get-ItemProperty 'HKLM:\SOFTWARE\Policies\Microsoft\Windows Defender' -ErrorAction SilentlyContinue
if ($policy.DisableAntiSpyware -eq 1) { Write-Warning "DisableAntiSpyware=1" }
Get-MpThreatDetection | Where-Object { $_.ThreatName -like '*Tampering*' } |
  Select-Object ThreatName, InitialDetectionTime, Resources

# [2/2] Windows Update
$wu = Get-ItemProperty 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate' -ErrorAction SilentlyContinue
if ($wu.WUServer) { Write-Warning "WUServer: $($wu.WUServer)" }
Get-WinEvent -FilterHashtable @{ LogName='System'; ProviderName='Microsoft-Windows-WindowsUpdateClient' } -MaxEvents 25
```

这个思路特别适合系统运维场景：先把“稳定探针”沉淀出来，再谈修复。下次同类问题出现时，不需要重新组织问题，先跑脚本拿状态快照即可。

---

<a id="win11"></a>
## 番外：Win11 升级可行性评估
我顺手让 Agent 做了 Win11 适配检查，核心命令：

```powershell
Get-ComputerInfo | Select-Object OsName, OsVersion, OsBuildNumber, BiosFirmwareType, CsTotalPhysicalMemory, CsModel
Get-CimInstance Win32_Processor | Select-Object Name, Manufacturer, NumberOfCores
Get-Tpm
Confirm-SecureBootUEFI
```

结论是：固件、内存、TPM 条件基本满足，但 CPU 代际不在官方支持清单，Windows Update 正常路径不会推送 Win11。最终选择维持 Win10 22H2 稳定运行，这比“为了升级而升级”更理性。

---

<a id="learnings"></a>
## 几件希望更早知道的事
<a id="learning-sc"></a>
### 1) `sc` 别名坑并不小众
PowerShell 里 `sc` 默认指向 `Set-Content`。凡是 `sc config ...` 这类命令，建议直接写 `sc.exe` 或换 `Set-Service`，避免把环境差异当成系统故障。

<a id="learning-admin"></a>
### 2) 管理员权限有边界
安全服务相关配置常被 ACL 额外保护。看到“拒绝访问 5”时，不要默认是“没提权成功”，先确认对象是否属于受保护服务。

<a id="learning-ppl"></a>
### 3) PPL 场景别硬拉服务
`LaunchProtected` 相关服务很多时候不是“命令写对就能拉起”，而是必须等待系统触发时序。改完配置就重启，通常更快。

<a id="learning-order"></a>
### 4) 先停再改再启，要写进肌肉记忆
重置缓存、替换目录、更新证书链这类动作，都遵循“释放占用 → 修改对象 → 恢复服务”模型。顺序错了，报错常常不直观。

<a id="learning-wsus"></a>
### 5) WSUS 策略值得常规巡检
只要更新长期失败，就先看：

```powershell
Get-ItemProperty 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate' -ErrorAction SilentlyContinue
```

若出现未知 `WUServer`，先回退策略，再谈组件修复。

<a id="learning-threat-history"></a>
### 6) Defender 历史记录是低成本取证入口
`Get-MpThreatDetection` 能快速回答“系统曾拦过什么、在哪儿拦的、何时拦的”。在“策略被反复改写”场景里，它比单看 UI 提示更可靠。

---

<a id="agent-value"></a>
## Agent 真正帮到的，不是“替你点按钮”
<a id="agent-value-probe"></a>
### 1) 它会自主收集证据而不是等你喂日志
给目标后，Agent 能自己选择探测顺序：服务态、策略键、威胁历史、更新策略、DNS、进程态。排障效率来自“主动探索”，不是“回合制问答”。

<a id="agent-value-self-correct"></a>
### 2) 它能发现并修正自己上一轮错误
`sc` 别名坑就是典型：先自证再修正。系统排障里这点很关键，因为你最怕的是“看起来专业但无法执行”的命令。

<a id="agent-value-context"></a>
### 3) 它有长会话记忆，能做历史回放
1058 那次定位，本质靠的是回放早先命令顺序。如果每轮都要你手工复述上下文，排障成本会迅速失控。

<a id="agent-value-hypothesis"></a>
### 4) 它会主动建假设并补证据链
从 WSUS 字段异常到 fake-ip 叠加拦截，是完整的“假设 → 验证 → 收敛”流程。这个流程比单点答案更有复用价值。

<a id="agent-value-artifact"></a>
### 5) 它能把经验沉淀成工件
一次故障会话，最后变成可重复运行的诊断脚本。对运维类工作来说，工件比结论更重要。

<a id="agent-value-boundary"></a>
### 6) 但它也有明确边界
- 无法替你执行需要人工确认的高风险动作
- 无法替你按 UAC、重启系统、做物理侧检查
- 无法替你承担写入后的不可逆后果

最稳妥的协作方式是：让 Agent 负责信息获取与推理，你负责变更执行与风险兜底。

<a id="agent-vs-ask"></a>
### Ask 与 Agent 在系统排障里的差异
这次复盘里，两种模式的体感差异很明显：

| 维度 | Ask 模式 | Agent 模式 |
| --- | --- | --- |
| 信息收集 | 需要你一条条复制输出回贴 | 能直接跑只读命令并继续追问 |
| 错误修正 | 偏“解释为什么错” | 会先验证再调整方案 |
| 上下文连续性 | 多轮后容易丢前文细节 | 能回放前面执行顺序与状态 |
| 产物形式 | 偏结论文本 | 能沉淀成脚本和检查清单 |
| 人类负担 | 更依赖操作者组织信息 | 更依赖操作者做风险把关 |

所以在系统排障里，我的经验是：**让 Ask/Agent 做“探测与收敛”，让人做“执行与审计”**，效率和安全性更平衡。Ask 面向只读探索，Agent 可编辑文件和调用工具；实际审批由 Run Modes（Auto-review、Allowlist、Run Everything）、沙箱、团队策略和当次批准共同决定。`permissions.json` 只是 Auto-review 的便利配置，不是安全边界。

---

<a id="playbook"></a>
## 一份可复用的诊断顺序卡
如果你也遇到“安全中心异常 + 更新失败并发”这类问题，可以按下面这张顺序卡执行。它不是“一键修复”，而是帮助你避免走弯路的最短路径。

<a id="playbook-snapshot"></a>
### 第 0 步：先拿快照，不急着写入
先把状态导出，后续任何变更都基于对比：

```powershell
Get-Service wscsvc, mpssvc, BFE, WinDefend, WdNisSvc, SecurityHealthService |
  Format-Table Name, Status, StartType -AutoSize

Get-ItemProperty 'HKLM:\SOFTWARE\Policies\Microsoft\Windows Defender' -ErrorAction SilentlyContinue
Get-ItemProperty 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate' -ErrorAction SilentlyContinue
Get-ItemProperty 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU' -ErrorAction SilentlyContinue
```

这一步看似慢，实际能省很多时间。没有基线快照，你很难判断某条命令到底改变了什么，也很难在失败后回溯。

<a id="playbook-policy-first"></a>
### 第 1 步：优先收敛策略层
无论是 Defender 还是 Update，策略层都是杠杆最大的入口：

- Defender 线先看 `DisableAntiSpyware`
- Update 线先看 `WUServer / WUStatusServer / UseWUServer`

若这两条线都异常，先回退策略，再做服务与组件层操作。否则你会陷入“表面修好，下一轮又被写回”的循环。

<a id="playbook-small-steps"></a>
### 第 2 步：动作小步化，每轮只改一类变量
建议把写入动作拆成三轮，每轮后立即验证：

1. **策略轮**：只改策略键，不碰缓存目录  
2. **服务轮**：只改启动类型和服务状态，不跑组件修复  
3. **组件轮**：仅在前两轮完成后执行 DISM/SFC

每轮结束都记录“输入命令 + 输出状态 + 是否达成目标”。这会让整个排障过程非常清晰，适合后续复盘与迁移。

<a id="playbook-artifact"></a>
### 第 3 步：把结论固化成脚本与检查项
排障完成不是终点。至少做两件事：

- 让 Agent 生成一份只读诊断脚本（可定期执行）
- 让 Agent 生成一份“异常判定检查项”文档（命中什么算异常）

当同类问题再次出现时，你无需重新组织上下文，直接执行脚本、对照检查项就能快速定位。

---

<a id="advice"></a>
## 给读者的四条实操建议
1. 安全中心空白时，先查服务状态 + `DisableAntiSpyware`，不要直接重装系统。  
2. 更新失败先查 WSUS 策略，再决定是否跑 DISM/SFC。  
3. 涉及受保护服务时，不要在运行态死磕 `Start-Service`，优先调整后重启验证。  
4. 每次排障结束都让 Agent 产出“可复用诊断脚本”，把经验沉淀下来。

---

<a id="related"></a>
## 延伸阅读
- [Cursor 完整指南（注册 / 模型 / Agent）](../cursor-guide.md)
- [Cursor 通过 SSH 连接 Linux 远程开发](../practice/cursor-ssh-linux.md)
- [用 Cursor 上线自己的网站（静态站实战）](../practice/cursor-build-static-site.md)

---

<a id="sources"></a>
## 官方来源与声明
最后核验：**2026-09-03**

- [Cursor Agent Security](https://cursor.com/docs/agent/security)
- [Run Modes](https://cursor.com/docs/agent/security/run-modes)
- [Prompting Agents](https://cursor.com/docs/agent/prompting)

本文为原创故障复盘，非 Cursor 或 Microsoft 官方修复指南；文中“实测”“经验”仅描述当时环境。内容曾由 AI 辅助整理；发布前应由维护者依据官方资料完成人工复核。修改注册表、系统服务和更新组件前请建立备份，并以当前 Windows 官方文档及现场证据为准。
