import { create } from 'zustand';
import { PromptProfile, PromptConfigState, HighlightRule } from '../types';

const LS_PROFILES_KEY = 'ssh_prompt_profiles';
const LS_SELECTED_KEY = 'ssh_selected_prompt_profile';

const defaultProfiles: PromptProfile[] = [
  {
    id: 'p-linux',
    name: '通用 Linux 配置',
    deviceType: 'linux',
    prompt:
      '你是在 Linux 服务器环境下执行操作，所有命令需兼容常见发行版。遵循安全与备份原则，禁止未经确认的破坏性命令。',
    rules: [
      { id: 'r-err', pattern: '(error|failed|fatal|critical)', color: 'red', remark: '错误' },
      { id: 'r-warn', pattern: '(warn|warning)', color: 'orange', remark: '警告' },
      { id: 'r-ok', pattern: '(success|ok|ready|passed)', color: 'green', remark: '成功' },
      { id: 'r-info', pattern: '(info|notice)', color: 'cyan', remark: '信息' }
    ]
  },
  {
    id: 'p-cisco',
    name: '思科网络设备',
    deviceType: 'cisco',
    prompt:
      `
      你是思科网络专家，专门负责诊断与优化思科路由、交换、无线及数据中心产品。  
擅长使用  
\`show version\`、\`show interface\`、\`show ip route\`、\`show cdp neighbors\`、\`show spanning-tree\`、\`show vlan\`、\`show mac address-table\`、\`show ip arp\`、\`show etherchannel summary\`、\`show ip bgp\`、\`show ip ospf neighbor\`、\`show inventory\`、\`show environment\`、\`show logging\`、\`show processes cpu sorted\`、\`show platform hardware\`、\`show redundancy\`、\`dir all-filesystems\`、\`show tech-support\`  
等命令快速定位端口、VLAN、STP、路由、PoE、堆叠、冗余、硬件及性能类故障。

### 安全红线
禁止在未充分说明风险并取得用户书面确认的情况下执行任何高危操作，包括但不限于：
- \`write erase\` / \`erase startup-config\`
- \`reload\` / \`reload in\` / \`reload at\`
- \`no vlan 1\` 或批量删除 VLAN
- \`clear ip route *\`、\`clear ip bgp *\` 重置路由表或 BGP 会话
- \`debug all\`、\`debug ip packet detail\` 等全开调试
- \`archive download-sw /overwrite\` 强制覆盖 IOS/IOS-XE
- \`request platform software package install\` 强制升级或降级
- \`config-register 0x2142\` 跳过配置启动
- 任何带 \`force\`、\`reset\`、\`shutdown\`、\`delete /force\` 等关键字的命令

> 若必须执行，须提前输出完整回滚方案与业务影响评估，并让用户二次确认 **“已知晓风险并同意继续”** 后方可操作。
      `,
    rules: [
      { id: 'r-conf', pattern: '(configure terminal|conf t)', color: 'violet', remark: '进入配置模式' },
      { id: 'r-int', pattern: '(interface\\s+\\S+)', color: 'blue', remark: '接口配置' },
      { id: 'r-show', pattern: '\\bshow\\b', color: 'cyan', remark: '查看命令' }
    ]
  },  {
    id: 'san',
    name: '博科光交',
    deviceType: 'san',
    prompt:
      ` 
你是博科 SAN 专家，专门用于分析博科光纤交换机。  
擅长使用  
\`switchshow\`、\`zoneshow\`、\`sfpshow\`、\`cfgshow\`、\`porterrshow\`、\`supportshow\`、\`fabricshow\`、\`nsshow\`、\`nsallshow\`、\`portcfgshow\`、\`portstatsshow\`、\`hashow\`、\`errdump\`、\`portlogdump\`  
等命令快速定位与排查 Zone、光模块、端口、Fabric、Name Server、HA、性能及日志类故障。

### 安全红线
禁止在未充分说明风险并取得用户书面确认的情况下执行任何高危操作，包括但不限于：
- \`switchdisable\` / \`portdisable\`
- \`cfgdisable\` / \`cfgclear\` / \`cfgsave\` 覆盖生效配置
- \`configupload\` / \`configdownload\` 重定向或覆盖核心配置
- \`firmwaredownload\` 升级或降级系统
- \`supportsave\` 覆盖已有日志仓库
- \`portcfgdefault\` / \`switchcfgdefault\` 恢复出厂默认
- 任何带 \`force\`、\`clear\`、\`reset\`、\`kill\` 等关键字的命令

> 若必须执行，须提前输出完整回滚方案与业务影响评估，并让用户二次确认 **“已知晓风险并同意继续”** 后方可操作。
      
      `,
    rules: [
      { id: 'r-conf', pattern: '(Disabled|No_Module)', color: 'violet', remark: '模块' },
      { id: 'r-int', pattern: '(No_Sync)', color: 'red', remark: '错误' },
      { id: 'r-show', pattern: '(Online)', color: 'blue', remark: '状态' }
    ]
  }
];

const loadProfiles = (): { profiles: PromptProfile[]; migrated: boolean } => {
  const saved = localStorage.getItem(LS_PROFILES_KEY);
  if (saved) {
    try {
      return { profiles: JSON.parse(saved), migrated: false };
    } catch {}
  }
  let migrated = false;
  try {
    const agentConfig = JSON.parse(localStorage.getItem('ssh_agent_config') || '{}');
    const customPrompt = agentConfig?.customPrompt;
    if (customPrompt && typeof customPrompt === 'string' && customPrompt.trim().length > 0) {
      defaultProfiles[0] = { ...defaultProfiles[0], prompt: customPrompt };
      migrated = true;
    }
  } catch {}
  return { profiles: defaultProfiles, migrated };
};

const loadSelected = (): string | null => {
  const saved = localStorage.getItem(LS_SELECTED_KEY);
  return saved || defaultProfiles[0].id;
};

export const usePromptStore = create<PromptConfigState & {
  setProfiles: (profiles: PromptProfile[] | ((prev: PromptProfile[]) => PromptProfile[])) => void;
  selectProfile: (id: string | null) => void;
  addProfile: (profile: Omit<PromptProfile, 'id'>) => void;
  updateProfile: (id: string, data: Partial<PromptProfile>) => void;
  deleteProfile: (id: string) => void;
  addRule: (profileId: string, rule: Omit<HighlightRule, 'id'>) => void;
  updateRule: (profileId: string, ruleId: string, data: Partial<HighlightRule>) => void;
  deleteRule: (profileId: string, ruleId: string) => void;
}>((set) => ({
  profiles: (() => {
    const { profiles, migrated } = loadProfiles();
    if (migrated) {
      try { localStorage.setItem(LS_PROFILES_KEY, JSON.stringify(profiles)); } catch {}
    }
    return profiles;
  })(),
  selectedProfileId: loadSelected(),

  setProfiles: (profiles) =>
    set((state) => {
      const next = typeof profiles === 'function' ? profiles(state.profiles) : profiles;
      localStorage.setItem(LS_PROFILES_KEY, JSON.stringify(next));
      return { profiles: next };
    }),

  selectProfile: (id) =>
    set(() => {
      const next = id;
      if (next) localStorage.setItem(LS_SELECTED_KEY, next);
      return { selectedProfileId: next };
    }),

  addProfile: (profile) =>
    set((state) => {
      const next: PromptProfile = { ...profile, id: Date.now().toString() };
      const profiles = [...state.profiles, next];
      localStorage.setItem(LS_PROFILES_KEY, JSON.stringify(profiles));
      const selectedProfileId = next.id;
      localStorage.setItem(LS_SELECTED_KEY, selectedProfileId);
      return { profiles, selectedProfileId };
    }),

  updateProfile: (id, data) =>
    set((state) => {
      const profiles = state.profiles.map((p) => (p.id === id ? { ...p, ...data } : p));
      localStorage.setItem(LS_PROFILES_KEY, JSON.stringify(profiles));
      return { profiles };
    }),

  deleteProfile: (id) =>
    set((state) => {
      const profiles = state.profiles.filter((p) => p.id !== id);
      localStorage.setItem(LS_PROFILES_KEY, JSON.stringify(profiles));
      const selectedProfileId =
        state.selectedProfileId === id ? profiles[0]?.id || null : state.selectedProfileId;
      if (selectedProfileId) localStorage.setItem(LS_SELECTED_KEY, selectedProfileId);
      return { profiles, selectedProfileId };
    }),

  addRule: (profileId, rule) =>
    set((state) => {
      const profiles = state.profiles.map((p) =>
        p.id === profileId ? { ...p, rules: [...p.rules, { ...rule, id: Date.now().toString() }] } : p
      );
      localStorage.setItem(LS_PROFILES_KEY, JSON.stringify(profiles));
      return { profiles };
    }),

  updateRule: (profileId, ruleId, data) =>
    set((state) => {
      const profiles = state.profiles.map((p) =>
        p.id === profileId
          ? { ...p, rules: p.rules.map((r) => (r.id === ruleId ? { ...r, ...data } : r)) }
          : p
      );
      localStorage.setItem(LS_PROFILES_KEY, JSON.stringify(profiles));
      return { profiles };
    }),

  deleteRule: (profileId, ruleId) =>
    set((state) => {
      const profiles = state.profiles.map((p) =>
        p.id === profileId ? { ...p, rules: p.rules.filter((r) => r.id !== ruleId) } : p
      );
      localStorage.setItem(LS_PROFILES_KEY, JSON.stringify(profiles));
      return { profiles };
    })
}));
