'use strict';

const VALID_ROLES = new Set([ 'admin', 'student', 'teacher' ]);
const USERNAME_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

function hasValidIdentity(auth) {
  return Boolean(
    auth
    && VALID_ROLES.has(auth.role)
    && typeof auth.username === 'string'
    && USERNAME_PATTERN.test(auth.username)
  );
}

function isAdmin(auth) {
  return hasValidIdentity(auth) && auth.role === 'admin';
}

function isRole(auth, ...roles) {
  return hasValidIdentity(auth) && roles.includes(auth.role);
}

function isSelfOrAdmin(auth, role, username) {
  if (isAdmin(auth)) {
    return true;
  }
  return hasValidIdentity(auth)
    && auth.role === role
    && auth.username === username;
}

function resolveOwnIdentity(auth, requestedUsername, requestedRole) {
  if (!hasValidIdentity(auth)) {
    return null;
  }
  if (isAdmin(auth)) {
    if (
      !VALID_ROLES.has(requestedRole)
      || typeof requestedUsername !== 'string'
      || !USERNAME_PATTERN.test(requestedUsername)
    ) {
      return null;
    }
    return { username: requestedUsername, role: requestedRole };
  }
  if (
    (requestedUsername && requestedUsername !== auth.username)
    || (requestedRole && requestedRole !== auth.role)
  ) {
    return null;
  }
  return { username: auth.username, role: auth.role };
}

function activityMembershipQuery(auth, activityId) {
  if (!hasValidIdentity(auth) || !activityId || isAdmin(auth)) {
    return null;
  }
  if (auth.role === 'student') {
    return { activityId: String(activityId), studentId: auth.username };
  }
  if (auth.role === 'teacher') {
    return { activityId: String(activityId), teacherId: auth.username };
  }
  return null;
}

async function hasActivityAccess(models, auth, activityId) {
  if (isAdmin(auth)) {
    return true;
  }
  const query = activityMembershipQuery(auth, activityId);
  if (!query) {
    return false;
  }
  return Boolean(await models.UserInActivity.exists(query));
}

async function canTeacherAccessStudent(models, auth, studentId, activityId) {
  if (isAdmin(auth) || isSelfOrAdmin(auth, 'student', studentId)) {
    return true;
  }
  if (!isRole(auth, 'teacher') || !activityId) {
    return false;
  }
  const activityKey = String(activityId);
  const [ teacherMember, studentMember, choseTeacher ] = await Promise.all([
    models.UserInActivity.exists({ activityId: activityKey, teacherId: auth.username }),
    models.UserInActivity.exists({ activityId: activityKey, studentId }),
    models.Choose.exists({ activityId: activityKey, studentId, teacherId: auth.username }),
  ]);
  return Boolean(teacherMember && studentMember && choseTeacher);
}

module.exports = {
  VALID_ROLES,
  canTeacherAccessStudent,
  hasActivityAccess,
  hasValidIdentity,
  isAdmin,
  isRole,
  isSelfOrAdmin,
  resolveOwnIdentity,
};
