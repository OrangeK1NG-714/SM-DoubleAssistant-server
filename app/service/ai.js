'use strict';

const Service = require('egg').Service;
const fs = require('fs');

/**
 * 学生方向关键词映射
 * 学生在 userMsg 填写的 direction 字段可能是这些值
 */
const DIRECTION_KEYWORDS = {
  ai: ['人工智能', '深度学习', '机器学习', '大模型', '多模态', '知识图谱', '数据挖掘', '计算机视觉', 'nlp', '语音', '自然语言', '智能', '算法', '脑', '检测'],
  design: ['交互', '用户体验', '视觉设计', '前端', '产品设计', '数字媒体', '图形', '动画', '品牌', '游戏', '影视', '短视频', '动漫', '图像', '非遗', '数字化', 'VR', '虚拟'],
  engineering: ['系统', '网络', '数据库', '云计算', '分布式', '软件', '程序设计', '开发', '移动', '区块链', 'C语言', 'C++', 'Java', 'Python', 'ACM', '竞赛'],
};

/**
 * 学生填写的 direction 到方向类别的映射
 */
function classifyStudentDirection(direction) {
  if (!direction) return 'general';
  const d = direction.toLowerCase();
  if (d.includes('人工智能') || d.includes('ai') || d.includes('深度学习') || d.includes('机器学习') || d.includes('算法') || d.includes('数据')) return 'ai';
  if (d.includes('设计') || d.includes('交互') || d.includes('视觉') || d.includes('前端') || d.includes('游戏') || d.includes('动画') || d.includes('影视') || d.includes('媒体')) return 'design';
  if (d.includes('开发') || d.includes('工程') || d.includes('系统') || d.includes('网络') || d.includes('后端') || d.includes('软件')) return 'engineering';
  return 'general';
}

/**
 * 计算文本与关键词列表的匹配分数
 */
function textMatchScore(text, keywords) {
  if (!text || !keywords || keywords.length === 0) return 0;
  const t = text.toLowerCase();
  let hits = 0;
  for (const kw of keywords) {
    if (t.includes(kw.toLowerCase())) hits++;
  }
  return Math.min(1.0, hits / Math.max(1, keywords.length * 0.3));
}

/**
 * 计算老师研究领域与学生方向的匹配度
 */
function computeDirectionScore(teacherText, studentDirection) {
  const category = classifyStudentDirection(studentDirection);
  if (category === 'general') {
    // 通用方向：对所有老师给中等分
    return 0.4;
  }

  const keywords = DIRECTION_KEYWORDS[category] || [];
  const score = textMatchScore(teacherText, keywords);

  // 额外检查：学生 direction 原文是否直接出现在老师文本中
  if (studentDirection && teacherText.toLowerCase().includes(studentDirection.toLowerCase())) {
    return Math.min(1.0, score + 0.3);
  }

  return score;
}

class AiService extends Service {
  /**
   * 加载 teacher_data.csv 中的教师详细信息
   * @returns {Object} teacherName -> {research, teaching, fullText}
   */
  _loadTeacherProfiles() {
    const csvPath = this.app.config.aiModel.teacherDataPath;
    if (!csvPath || !fs.existsSync(csvPath)) {
      return {};
    }

    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim());
    if (lines.length < 2) return {};

    const headers = lines[0].replace(/^\uFEFF/, '').split(',');
    const nameIdx = headers.findIndex(h => h.includes('姓名'));
    const researchIdx = headers.findIndex(h => h.includes('研究领域'));
    const teachingIdx = headers.findIndex(h => h.includes('教学情况'));

    if (nameIdx === -1) return {};

    const profileMap = {};
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      const name = (cols[nameIdx] || '').trim();
      if (!name) continue;

      const research = (researchIdx >= 0 ? cols[researchIdx] : '') || '';
      const teaching = (teachingIdx >= 0 ? cols[teachingIdx] : '') || '';
      const fullText = `${research} ${teaching}`.trim();

      profileMap[name] = { research, teaching, fullText };
    }
    return profileMap;
  }

  /**
   * 为学生推荐导师（纯 JS 评分引擎）
   *
   * 策略：
   * - Top1/Top2（第一、二志愿）：方向匹配度高的老师
   * - Top3（第三志愿/保底）：冷门老师，竞争低，提高整体中选率
   *
   * @param {string} studentId
   * @param {string} activityId
   * @returns {Object} { items: [{teacherId, name, matchScore, reason, slot}] }
   */
  async recommendTeachers(studentId, activityId) {
    const { ctx } = this;

    // 1. 查询学生信息
    const student = await ctx.model.Student.findOne({ studentId });
    if (!student) {
      return { items: [], error: '学生信息不存在，请先填写个人信息' };
    }
    const studentData = student.data || {};
    const studentDirection = (studentData.direction || '').trim();
    const studentGpa = parseFloat(studentData.gpa) || 0;

    // 2. 查询活动中的老师列表
    const teacherInActivity = await ctx.model.UserInActivity.find({
      activityId,
      teacherId: { $exists: true, $ne: '' },
    });
    if (!teacherInActivity || teacherInActivity.length === 0) {
      return { items: [], error: '该活动中没有导师' };
    }

    const teacherIds = teacherInActivity.map(t => t.teacherId);
    const maxSelectMap = {};
    teacherInActivity.forEach(t => {
      if (t.maxSelectNum) {
        maxSelectMap[t.teacherId] = t.maxSelectNum;
      }
    });

    // 3. 查询老师详情
    const teachers = await ctx.model.Teacher.find({ teacherId: { $in: teacherIds } });
    const teacherMap = {};
    teachers.forEach(t => {
      teacherMap[t.teacherId] = t;
    });

    // 4. 查询该活动所有选择记录
    const allChooses = await ctx.model.Choose.find({ activityId });
    const chooseByTeacher = {};
    allChooses.forEach(c => {
      if (!chooseByTeacher[c.teacherId]) {
        chooseByTeacher[c.teacherId] = [];
      }
      chooseByTeacher[c.teacherId].push(c);
    });

    // 5. 加载教师画像
    const profileMap = this._loadTeacherProfiles();

    // 6. 为每位老师计算评分
    const scored = [];
    for (const tid of teacherIds) {
      const teacher = teacherMap[tid];
      if (!teacher) continue;

      const teacherName = (teacher.name || '').trim();
      const chooses = chooseByTeacher[tid] || [];
      const chooseCount = chooses.length;
      const acceptedCount = chooses.filter(c => c.isChose).length;
      const maxSelect = maxSelectMap[tid] || 10;

      // 已满的老师跳过
      if (acceptedCount >= maxSelect) continue;

      // 获取老师的研究领域文本
      const profile = profileMap[teacherName] || {};
      const teacherFullText = profile.fullText || teacher.msg || '';

      // === 评分维度 ===

      // (A) 方向匹配分 [0-1]
      const directionScore = computeDirectionScore(teacherFullText, studentDirection);

      // (B) 竞争安全分 [0-1]：被选人越少越安全
      const safetyScore = Math.max(0, 1 - (chooseCount / Math.max(1, maxSelect * 3)));

      // (C) 容量余量分 [0-1]：剩余名额越多越好
      const remainRatio = Math.max(0, (maxSelect - acceptedCount) / maxSelect);
      const capacityScore = remainRatio;

      // (D) 画像深度匹配分 [0-1]
      const category = classifyStudentDirection(studentDirection);
      let profileScore = 0.3; // 默认
      if (category !== 'general' && teacherFullText) {
        const kws = DIRECTION_KEYWORDS[category] || [];
        profileScore = textMatchScore(teacherFullText, kws);
      }

      // === 综合分（用于 Top1/Top2 推荐）===
      const matchScore = (
        0.40 * directionScore
        + 0.20 * profileScore
        + 0.25 * safetyScore
        + 0.15 * capacityScore
      );

      // === 保底分（用于 Top3 推荐）===
      const safeScore = (
        0.15 * directionScore
        + 0.10 * profileScore
        + 0.45 * safetyScore
        + 0.30 * capacityScore
      );

      scored.push({
        teacherId: tid,
        name: teacherName,
        matchScore: Math.round(matchScore * 10000) / 10000,
        safeScore: Math.round(safeScore * 10000) / 10000,
        directionScore: Math.round(directionScore * 10000) / 10000,
        safetyScore: Math.round(safetyScore * 10000) / 10000,
        capacityScore: Math.round(capacityScore * 10000) / 10000,
        profileScore: Math.round(profileScore * 10000) / 10000,
        chooseCount,
        maxSelect,
        acceptedCount,
      });
    }

    if (scored.length === 0) {
      return { items: [], error: '没有可推荐的导师' };
    }

    // 7. 选出 Top1/Top2（按 matchScore 排序）
    const byMatch = [...scored].sort((a, b) => b.matchScore - a.matchScore);
    const top1 = byMatch[0];
    const top2 = byMatch.length > 1 ? byMatch[1] : null;

    const usedIds = new Set();
    const items = [];

    if (top1) {
      usedIds.add(top1.teacherId);
      items.push({
        teacherId: top1.teacherId,
        name: top1.name,
        matchScore: top1.matchScore,
        slot: '第一志愿',
        reason: `方向匹配度高(${(top1.directionScore * 100).toFixed(0)}%)，研究领域与你的兴趣方向契合`,
        detail: top1,
      });
    }

    if (top2) {
      usedIds.add(top2.teacherId);
      items.push({
        teacherId: top2.teacherId,
        name: top2.name,
        matchScore: top2.matchScore,
        slot: '第二志愿',
        reason: `方向匹配度较高(${(top2.directionScore * 100).toFixed(0)}%)，综合评分优秀`,
        detail: top2,
      });
    }

    // 8. 选出 Top3（按 safeScore 排序，排除已选的）
    const bySafe = [...scored]
      .filter(s => !usedIds.has(s.teacherId))
      .sort((a, b) => b.safeScore - a.safeScore);

    const top3 = bySafe.length > 0 ? bySafe[0] : null;
    if (top3) {
      items.push({
        teacherId: top3.teacherId,
        name: top3.name,
        matchScore: top3.safeScore,
        slot: '第三志愿(保底)',
        reason: `竞争较低(已选${top3.chooseCount}人)，剩余名额充足，中选概率高`,
        detail: top3,
      });
    }

    return { items };
  }
}

module.exports = AiService;
