export const KEY = 'anomalous-everyday-v1';
export const jobs = [
  {id:'umbrella', number:'01', place:'失物招领处', title:'一把拒绝下雨的伞', tag:'档案 · 城南', icon:'☂', time:'3 分钟', intro:'柜台上躺着一把透明雨伞。它的失主栏写着你的名字，领取日期却是明天。管理员是一只穿着雨衣的水母。', clue:'伞柄贴着一张标签：“雨不是从天上掉下来的，是城市忘记的事情太重了。”伞骨间夹着车票，上面只有一个字：留。', question:'水母问：“失主还没出现。你想怎么处理它？”', choices:[['keep','替明天的自己保管','你把伞留在柜台。伞尖滴出一段温暖的旧回忆。'],['return','把伞寄给昨日的陌生人','你写下一个不存在的地址。水母郑重地盖了邮戳。']], artifact:'透明车票', word:'留', prompt:'现实小支线（可跳过）：在身边找一件很久没用的物品，想起它第一次来到你身边的样子。无需上传任何东西。'},
  {id:'lift', number:'02', place:'末班电梯', title:'不存在的第十三层', tag:'档案 · 垂直街', icon:'↟', time:'3 分钟', intro:'这座楼只有十二层。每天 25:00，电梯会多出一个按钮。门缝里传来海浪声，一张请假条正在独自等电梯。', clue:'请假条背面写着：“我们总把没来得及说的话放到明天。明天的仓库已经满了。”最后一行只有一个字：一。', question:'电梯门开了，里面站着“如果当初”的你。', choices:[['keep','陪另一个自己坐一会儿','你们谁也没解释。电梯在一声叹息里停止上升。'],['return','让电梯去从未抵达的地方','你替另一个自己按下开门键。海风吹散了请假条。']], artifact:'无字请假条', word:'一', prompt:'现实小支线（可跳过）：放下手机十秒钟，留意一个平时没听见的声音。不需要出门。'},
  {id:'moon', number:'03', place:'月亮洗衣店', title:'请勿烘干你的愿望', tag:'档案 · 天台', icon:'☾', time:'3 分钟', intro:'月亮正在一台滚筒洗衣机里脱水。老板说，有人把全城的明天混进了白色衣物，现在所有日历都停在今天。', clue:'洗衣机的洗标上写着：“明天不可折叠，不可熨烫，必须预留一点空白。”洗标末尾的字是：天。', question:'老板递给你一小瓶没实现的愿望。', choices:[['keep','留下一点，照亮回家的路','瓶子里升起一颗非常小、但不加班的太阳。'],['return','打开瓶盖，让愿望自己长大','愿望没有飞走。它们只是变成了你口袋里的风。']], artifact:'月光洗标', word:'天', prompt:'现实小支线（可跳过）：给明天留一件五分钟能完成的小事。不要制定伟大的计划，给自己留一点空白。'}
];
export const endings = {
  garden:{title:'明天长成了一座花园',label:'结局 01 · 慢一点也没关系',text:'你没有修好城市的钟。你在齿轮之间种了一粒种子。此后，每个人的日历都多了一格，写着“可以什么都不做”。水母第一次放了假。'},
  sea:{title:'城市向未知寄出自己',label:'结局 02 · 没到达，也算出发',text:'你打开明天的仓库，让所有没发生的可能性一起出发。末班电梯变成一艘船，城市驶向地图外。你不再需要知道每一站的名字。'},
  window:{title:'你给明天留了一扇窗',label:'隐藏结局 · 不必二选一',text:'你既没有保存全部过去，也没有扔掉所有遗憾。你在仓库的墙上开了一扇窗。月光负责照进来，风负责带走太重的事。明天终于愿意回来。'}
};
export const fresh = () => ({version:1, solved:{}, ending:null});
export function normalize(raw) {
  if (!raw || raw.version !== 1 || typeof raw.solved !== 'object' || !raw.solved) return fresh();
  const solved = {};
  for (const job of jobs) if (['keep','return'].includes(raw.solved[job.id])) solved[job.id] = raw.solved[job.id];
  return {version:1, solved, ending:Object.keys(solved).length === 3 && Object.hasOwn(endings,raw.ending) ? raw.ending : null};
}
export const completed = state => Object.keys(state.solved).length;
export const balanced = state => new Set(Object.values(state.solved)).size === 2;
export function solve(state,id,choice) {
  if (!jobs.some(j=>j.id===id) || !['keep','return'].includes(choice) || state.solved[id]) return state;
  return {...state, solved:{...state.solved,[id]:choice}};
}
export const correctCode = value => String(value).replace(/\s/g,'') === '留一天';
export function finish(state, ending, code) {
  if (completed(state)!==3 || !correctCode(code) || !Object.hasOwn(endings,ending) || (ending==='window'&&!balanced(state))) return state;
  return {...state,ending};
}
