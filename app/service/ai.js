'use strict';

const Service = require('egg').Service;
const fs = require('fs');
const fsp = fs.promises;

const DIRECTION_KEYWORDS = {
    前端开发工程师: ['前端', 'HTML5', '交互设计', '交互动画', '用户体验', 'UI', '可视化', '数据可视化', '移动应用', '移动开发', '多媒体', '数字媒体', '动画', '图形学'],
    后端开发工程师: ['后端', '服务器', '系统开发', '数据库', '网络', '分布式', 'Java', 'C语言', 'C++', '程序设计', '软件开发', '计算机网络', '数据结构', '算法设计'],
    测试开发工程师: ['测试', '白盒测试', '软件测试', '信息安全', '网络安全', '系统开发', 'C语言', '程序设计', '自动化'],
    算法工程师: ['算法', '深度学习', '机器学习', '计算机视觉', '自然语言处理', '数据挖掘', 'NLP', '人工智能', '数据分析', '文本挖掘', '姿态估计', '图像处理'],
    大模型开发工程师: ['大模型', '大语言模型', '多模态', '多智能体', 'Agent', 'NLP', '自然语言处理', '人工智能', '深度学习', '知识图谱'],
    UI设计师: ['UI设计', '视觉设计', '交互设计', '用户体验', '产品设计', '品牌设计', '图形', '色彩', '动漫', '数字媒体', '图像处理', '数字化', '动画'],
    产品经理: ['产品设计', '产品开发', '互联网产品', '用户体验', '交互设计', '品牌', '数字产品', 'UI', '数据分析', '项目管理'],
    游戏开发工程师: ['游戏策划', '游戏设计', '游戏开发', '游戏场景', '虚拟现实', 'VR', 'UE', '3D', '动画', '数字视频', '多媒体', 'C++', '图形学', '仿真', '引擎'],
    大数据工程师: ['大数据', '数据挖掘', '数据分析', '数据可视化', '机器学习', '数据处理', 'Python', '算法'],
    云计算工程师: ['云计算', '分布式', '系统开发', '后端', '网络', '服务器', '计算机网络', '大数据', '智慧城市', '智慧医疗'],
    影视后期制作师: ['视频剪辑', '影视', '短视频', '视频编导', '影视后期', '新媒体', '数字媒体', '媒体技术', '动画', '图像处理', '视觉', '策划', '数字视频'],
};

const DIRECTION_ALIASES = {
    前端开发: '前端开发工程师',
    后端开发: '后端开发工程师',
    测试开发: '测试开发工程师',
    'UI设计': 'UI设计师',
    产品设计: '产品经理',
    游戏策划: '游戏开发工程师',
    游戏开发: '游戏开发工程师',
    游戏设计与开发: '游戏开发工程师',
    视频剪辑: '影视后期制作师',
    视频编导: '影视后期制作师',
    影视与新媒体: '影视后期制作师',
    人工智能与大数据: '算法工程师',
};

let _cachedProfiles = null;
let _cachedProfilesPath = null;

function classifyStudentDirection(direction) {
    if (!direction) return 'general';
    const d = direction.trim();
    if (DIRECTION_KEYWORDS[d]) return d;
    if (DIRECTION_ALIASES[d]) return DIRECTION_ALIASES[d];
    const dLower = d.toLowerCase();
    for (const key of Object.keys(DIRECTION_KEYWORDS)) {
        if (dLower.includes(key.toLowerCase()) || key.toLowerCase().includes(dLower)) return key;
    }
    return 'general';
}

function textMatchScore(text, keywords) {
    if (!text || !keywords || keywords.length === 0) return 0;
    const t = text.toLowerCase();
    let hits = 0;
    for (const kw of keywords) {
        if (t.includes(kw.toLowerCase())) hits++;
    }
    return Math.min(1.0, hits / Math.max(1, keywords.length * 0.3));
}

function computeDirectionScore(teacherText, studentDirection) {
    const category = classifyStudentDirection(studentDirection);
    if (category === 'general') return 0.4;

    const keywords = DIRECTION_KEYWORDS[category] || [];
    const score = textMatchScore(teacherText, keywords);

    if (studentDirection && teacherText.toLowerCase().includes(studentDirection.toLowerCase())) {
        return Math.min(1.0, score + 0.3);
    }
    return score;
}

class AiService extends Service {
    async _loadTeacherProfiles() {
        const csvPath = this.app.config.aiModel.teacherDataPath;
        if (!csvPath || !fs.existsSync(csvPath)) return {};

        if (_cachedProfiles && _cachedProfilesPath === csvPath) {
            return _cachedProfiles;
        }

        const content = await fsp.readFile(csvPath, 'utf-8');
        const lines = content.split('\n').filter(l => l.trim());
        if (lines.length < 2) return {};

        const headers = lines[0].replace(/^﻿/, '').split(',');
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

        _cachedProfiles = profileMap;
        _cachedProfilesPath = csvPath;
        return profileMap;
    }

    clearProfileCache() {
        _cachedProfiles = null;
        _cachedProfilesPath = null;
    }

    async getTeacherProfiles() {
        const profileMap = await this._loadTeacherProfiles();
        return Object.entries(profileMap).map(([name, data]) => ({
            name,
            research: data.research || '',
            teaching: data.teaching || '',
        }));
    }

    async updateTeacherProfile(name, research, teaching) {
        const csvPath = this.app.config.aiModel.teacherDataPath;
        if (!csvPath || !fs.existsSync(csvPath)) {
            throw new Error('CSV 文件不存在');
        }

        const content = await fsp.readFile(csvPath, 'utf-8');
        const lines = content.split('\n').filter(l => l.trim());
        if (lines.length < 2) throw new Error('CSV 文件格式错误');

        const headers = lines[0].replace(/^﻿/, '');
        const headerCols = headers.split(',');
        const nameIdx = headerCols.findIndex(h => h.includes('姓名'));
        if (nameIdx === -1) throw new Error('CSV 缺少姓名列');

        let found = false;
        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',');
            if ((cols[nameIdx] || '').trim() === name.trim()) {
                cols[1] = research;
                cols[2] = teaching;
                lines[i] = cols.join(',');
                found = true;
                break;
            }
        }

        if (!found) {
            lines.push(`${name},${research},${teaching}`);
        }

        await fsp.writeFile(csvPath, lines.join('\n'), 'utf-8');
        this.clearProfileCache();
        return found ? 'updated' : 'added';
    }

    async recommendTeachers(studentId, activityId) {
        const { ctx } = this;

        const student = await ctx.model.Student.findOne({ studentId });
        if (!student) {
            return { items: [], error: '学生信息不存在，请先填写个人信息' };
        }
        const studentData = student.data || {};
        const studentDirection = (studentData.direction || '').trim();

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
            if (t.maxSelectNum) maxSelectMap[t.teacherId] = t.maxSelectNum;
        });

        const teachers = await ctx.model.Teacher.find({ teacherId: { $in: teacherIds } });
        const teacherMap = {};
        teachers.forEach(t => { teacherMap[t.teacherId] = t; });

        const allChooses = await ctx.model.Choose.find({ activityId });
        const chooseByTeacher = {};
        allChooses.forEach(c => {
            if (!chooseByTeacher[c.teacherId]) chooseByTeacher[c.teacherId] = [];
            chooseByTeacher[c.teacherId].push(c);
        });

        const profileMap = await this._loadTeacherProfiles();

        const scored = [];
        for (const tid of teacherIds) {
            const teacher = teacherMap[tid];
            if (!teacher) continue;

            const teacherName = (teacher.name || '').trim();
            const chooses = chooseByTeacher[tid] || [];
            const chooseCount = chooses.length;
            const acceptedCount = chooses.filter(c => c.isChose).length;
            const maxSelect = maxSelectMap[tid] || 10;

            if (acceptedCount >= maxSelect) continue;

            const profile = profileMap[teacherName] || {};
            const teacherFullText = profile.fullText || teacher.msg || '';

            const directionScore = computeDirectionScore(teacherFullText, studentDirection);
            const safetyScore = Math.max(0, 1 - (chooseCount / Math.max(1, maxSelect * 3)));
            const capacityScore = Math.max(0, (maxSelect - acceptedCount) / maxSelect);

            const category = classifyStudentDirection(studentDirection);
            let profileScore = 0.3;
            if (category !== 'general' && teacherFullText) {
                profileScore = textMatchScore(teacherFullText, DIRECTION_KEYWORDS[category] || []);
            }

            const matchScore = 0.40 * directionScore + 0.20 * profileScore + 0.25 * safetyScore + 0.15 * capacityScore;
            const safeScore = 0.15 * directionScore + 0.10 * profileScore + 0.45 * safetyScore + 0.30 * capacityScore;

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
