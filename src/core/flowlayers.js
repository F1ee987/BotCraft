// 由 build_exe/build_export_modules.py 从 BotCraft.html 自动生成，请勿手工编辑。
// 单一真实源是 BotCraft.html 里 /* ===== MODULE: core/flowlayers ===== */ 标记的段落。
// Kahn 拓扑排序。返回 { order, cycle }：cycle 非空表示这几张卡在环里、跑不起来。
function flowPlan(b) {
  var ns = (b && b.nodes) || [];
  var ids = {}, indeg = {}, adj = {};
  ns.forEach(function (n) { if (n && n.id) { ids[n.id] = 1; indeg[n.id] = 0; adj[n.id] = []; } });
  var seenE = {};
  ((b && b.edges) || []).forEach(function (e) {
    if (!e || !ids[e.from] || !ids[e.to] || e.from === e.to) return;
    var k = e.from + '>' + e.to;
    if (seenE[k]) return;
    seenE[k] = 1;
    adj[e.from].push(e.to);
    indeg[e.to]++;
  });
  var q = [];
  ns.forEach(function (n) { if (n && n.id && indeg[n.id] === 0) q.push(n.id); });
  var order = [];
  while (q.length) {
    var id = q.shift();
    order.push(id);
    (adj[id] || []).forEach(function (t) { indeg[t]--; if (indeg[t] === 0) q.push(t); });
  }
  var cycle = null;
  if (order.length < Object.keys(ids).length) {
    cycle = [];
    ns.forEach(function (n) { if (n && n.id && order.indexOf(n.id) < 0) cycle.push(n.id); });
  }
  return { order: order, cycle: cycle };
}

/* 把拓扑序拆成执行层（2026-10-12 P0-1 并行执行）。
   同层节点互为反链 —— 彼此无数据依赖，可以并发跑；跨层才有依赖，
   合流节点（多入边）所在层必然晚于它全部上游所在的层，于是「等所有上游
   到齐再继续」由分层天然保证，不需要额外的同步原语。
   层内顺序沿用拓扑序中的先后，保证 emit 顺序与 prev 取值确定、可复现。

   为什么不用 flowUpstream 取前驱：它返回的是**传递闭包**（整棵上游子树），
   分层要的是**直接**前驱。用传递闭包会把间接上游也当成依赖，层数虚高，
   并行度直接归零 —— 那这个函数就白做了。

   有环时与 flowPlan 同一套契约：layers 为空 + cycle 非空，调用方据此报错。 */
function flowLayers(b) {
  var plan = flowPlan(b);
  var order = (plan && plan.order) || [];
  if (!order.length || (plan && plan.cycle)) {
    return { layers: [], cycle: (plan && plan.cycle) || null, order: order };
  }
  var pred = {};   // 直接前驱（不做传递闭包，理由见上）
  ((b && b.edges) || []).forEach(function (e) {
    if (!e || !e.from || !e.to || e.from === e.to) return;
    (pred[e.to] = pred[e.to] || []).push(e.from);
  });
  var lvl = {};
  // order 是拓扑序：任何边 from→to 里 from 都排在 to 之前，
  // 所以顺序扫描一遍即可保证算 lvl[from] 时它已经就绪。
  order.forEach(function (id) {
    var m = 0, ps = pred[id] || [];
    for (var i = 0; i < ps.length; i++) {
      var p = ps[i], lp = lvl[p];
      if (lp != null && lp + 1 > m) m = lp + 1;
    }
    lvl[id] = m;
  });
  var layers = [];
  order.forEach(function (id) {
    var L = lvl[id] || 0;
    if (!layers[L]) layers[L] = [];
    layers[L].push(id);
  });
  for (var k = 0; k < layers.length; k++) if (!layers[k]) layers[k] = [];
  return { layers: layers, cycle: null, order: order };
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    flowPlan: typeof flowPlan !== "undefined" ? flowPlan : undefined,
    flowLayers: typeof flowLayers !== "undefined" ? flowLayers : undefined,
  };
}
