'use strict';

const Service = require('egg').Service;
const fs = require('fs');
const fsp = fs.promises;

const DIRECTION_KEYWORDS = {
    ai: ['人工智能', '深度学习', '机器学习', '大模型', '多模态', '知识图谱', '数据挖掘', '计算机视觉', 'nlp', '语音', '自然语言', '智能', '算法', '脑', '检测'],
    design: ['交互', '用户体验', '视觉设计', '前端', '产品设计', '数字媒体', '图形', '动画', '品牌', '游戏', '影视', '短视频', '动漫', '图像', '非遗', '数字化', 'VR', '虚拟'],
    engineering: ['系统', '网络', '数据库', '云计算', '分布式', '软件', '程序设计', '开发', '移动', '区块链', 'C语言', 'C++', 'Java', 'Python', 'ACM', '竞赛'],
};

let _cachedProfiles = null;
let _cachedProfilesPath = null;

function classifyStudentDirection(direction) {
    if (!direction) return 'general';
    const d = direction.toLowerCase();
    if (d.includes('人工智能') || d.includes('ai') || d.includes('深度学习') || d.includes('机器学习') || d.includes('算法') || d.includes('数据')) return 'ai';
    if (d.includes('设计') || d.includes('交互') || d.includes('视觉') || d.includes('前端') || d.includes('游戏') || d.includes('动画') || d.includes('影视') || d.includes('媒体')) return 'design';
    if (d.includes('开发') || d.includes('工程') || d.includes('系统') || d.includes('网络') || d.includes('后端') || d.includes('软件')) return 'engineering';
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
