'use strict';

const { strict: assert } = require('node:assert');
const fsp = require('node:fs').promises;
const os = require('node:os');
const path = require('node:path');
const { describe, it } = require('node:test');
const jwt = require('jsonwebtoken');
const UserinfoController = require('../../app/controller/userinfo');
const jwtMiddleware = require('../../app/middleware/jwt');
const AdminService = require('../../app/service/admin');
const StdinfoService = require('../../app/service/stdinfo');
const TeainfoService = require('../../app/service/teainfo');
const { canTeacherAccessStudent } = require('../../app/lib/access-control');
const {
  choiceFingerprint,
  normalizeChoices,
} = require('../../app/lib/selection-security');
const {
  acquireTeacherLock,
  releaseTeacherLock,
} = require('../../app/lib/selection-lock');
const { resolveExistingFileWithin } = require('../../app/lib/safe-path');

function responseContext(overrides = {}) {
  return {
    app: { config: {} },
    auth: { role: 'student', username: 'student-a' },
    logger: { error() {} },
    query: {},
    send(data, code, msg) {
      this.body = { code, data, msg };
      this.status = code;
    },
    service: {},
    ...overrides,
  };
}

function activeActivity() {
  return {
    firstChooseEndDate: new Date(Date.now() + 60_000),
    firstChooseStartDate: new Date(Date.now() - 60_000),
    secondChooseEndDate: new Date(Date.now() + 60_000),
    secondChooseStartDate: new Date(Date.now() - 60_000),
    stdChooseEndDate: new Date(Date.now() + 60_000),
    stdChooseStartDate: new Date(Date.now() - 60_000),
    thirdChooseEndDate: new Date(Date.now() + 60_000),
    thirdChooseStartDate: new Date(Date.now() - 60_000),
  };
}

function choiceList() {
  return [
    { order: 1, teacherId: 'teacher-a' },
    { order: 2, teacherId: 'teacher-b' },
    { order: 3, teacherId: 'teacher-c' },
  ];
}

function finalizationFixture({
  entry,
  failAfterFinal = false,
  failReservationCommit = false,
}) {
  const calls = {
    chooseUpdates: [],
    createdFinals: [],
    createdReservations: [],
    deletedFinals: [],
    deletedLocks: [],
    deletedReservations: [],
    reservationUpdates: [],
  };
  const ctx = {
    app: { config: {} },
    logger: { error() {} },
    model: {
      Activity: { findById: async () => activeActivity() },
      Choose: {
        findOne: async () => ({
          isChose: calls.chooseUpdates.some(item => item.update.$set.isChose),
          order: 2,
        }),
        findOneAndUpdate: async (filter, update) => {
          calls.chooseUpdates.push({ filter, update });
          if (entry === 'teacher' && failAfterFinal) {
            throw new Error('simulated choose update failure');
          }
          return { isChose: update.$set.isChose, order: 2 };
        },
      },
      Final: {
        countDocuments: async () => 0,
        create: async value => {
          calls.createdFinals.push(value);
          return { _id: 'final-1', ...value };
        },
        deleteOne: async filter => {
          calls.deletedFinals.push(filter);
        },
        findOne: async () => calls.createdFinals.at(-1) || null,
      },
      FinalReservation: {
        create: async value => {
          calls.createdReservations.push(value);
          return { _id: 'reservation-1', ...value };
        },
        deleteOne: async filter => {
          calls.deletedReservations.push(filter);
        },
        updateOne: async (filter, update) => {
          calls.reservationUpdates.push({ filter, update });
          if (entry === 'admin' && failAfterFinal) {
            throw new Error('simulated reservation write failure');
          }
          return {
            modifiedCount:
              entry === 'teacher' && failReservationCommit
                ? 0
                : 1,
          };
        },
        findOne: async () => (
          failReservationCommit
            ? {
              activityId: '507f1f77bcf86cd799439011',
              status: 'committed',
              studentId: 'student-a',
              teacherId: 'teacher-a',
            }
            : null
        ),
      },
      Student: {
        findOne: async () => ({
          data: { name: 'Server Truth', phone: '13800000000' },
          studentId: 'student-a',
        }),
      },
      TeacherOperationLock: {
        create: async value => value,
        deleteOne: async filter => {
          calls.deletedLocks.push(filter);
        },
      },
      UserInActivity: {
        findOne: async query => (
          query.teacherId
            ? { maxSelectNum: 2, teacherId: query.teacherId }
            : { studentId: query.studentId }
        ),
      },
    },
  };
  return { calls, ctx };
}

describe('object authorization and selection integrity', () => {
  it('serializes every teacher quota mutation through the shared lock', async () => {
    let currentLock = null;
    const duplicate = new Error('duplicate');
    duplicate.code = 11000;
    const models = {
      TeacherOperationLock: {
        async create(value) {
          if (currentLock) throw duplicate;
          currentLock = { _id: 'lock-1', ...value };
          return currentLock;
        },
        async deleteOne(filter) {
          if (currentLock && currentLock.ownerToken === filter.ownerToken) {
            currentLock = null;
          }
        },
        async findOne() {
          return currentLock;
        },
        async findOneAndUpdate() {
          throw new Error('active lock must not be reclaimed');
        },
      },
    };

    const first = await acquireTeacherLock(models, 'activity-a', 'teacher-a');
    const concurrent = await acquireTeacherLock(models, 'activity-a', 'teacher-a');
    assert.match(first, /^[0-9a-f-]{36}$/);
    assert.equal(concurrent, null);

    await releaseTeacherLock(models, 'activity-a', 'teacher-a', first);
    const afterRelease = await acquireTeacherLock(models, 'activity-a', 'teacher-a');
    assert.match(afterRelease, /^[0-9a-f-]{36}$/);
  });

  it('rejects lexical and symlink escapes from the upload root', async () => {
    const temp = await fsp.mkdtemp(path.join(os.tmpdir(), 'sm-safe-path-'));
    const uploadRoot = path.join(temp, 'uploads');
    const outsideRoot = path.join(temp, 'outside');
    await Promise.all([
      fsp.mkdir(uploadRoot),
      fsp.mkdir(outsideRoot),
    ]);
    const insideFile = path.join(uploadRoot, 'inside.pdf');
    const outsideFile = path.join(outsideRoot, 'secret.pdf');
    await Promise.all([
      fsp.writeFile(insideFile, 'inside'),
      fsp.writeFile(outsideFile, 'outside'),
    ]);
    await fsp.symlink(outsideRoot, path.join(uploadRoot, 'escape'));
    try {
      assert.equal(
        await resolveExistingFileWithin(uploadRoot, '../outside/secret.pdf'),
        null
      );
      assert.equal(
        await resolveExistingFileWithin(uploadRoot, 'escape/secret.pdf'),
        null
      );
      assert.equal(
        await resolveExistingFileWithin(uploadRoot, 'inside.pdf'),
        await fsp.realpath(insideFile)
      );
    } finally {
      await fsp.rm(temp, { force: true, recursive: true });
    }
  });

  it('rejects a student requesting another user detail before calling the service', async () => {
    let called = false;
    const ctx = responseContext({
      query: { role: 'student', username: 'student-b' },
      service: {
        userinfo: {
          async getUserDetail() {
            called = true;
          },
        },
      },
    });

    await new UserinfoController(ctx).getUserDetail();

    assert.equal(ctx.status, 403);
    assert.equal(called, false);
  });

  it('accepts only access tokens with a complete authenticated identity', async () => {
    const secret = 'test-access-secret-that-is-long-enough';
    const middleware = jwtMiddleware();
    let nextCalls = 0;
    const createContext = token => responseContext({
      app: { config: { jwt: { secret } } },
      headers: { authorization: `Bearer ${token}` },
      method: 'GET',
      path: '/api/user/detail',
    });

    const refreshLikeToken = jwt.sign({
      role: 'student',
      type: 'refresh',
      uid: 'user-id',
      username: 'student-a',
    }, secret);
    const refreshContext = createContext(refreshLikeToken);
    await middleware(refreshContext, async () => {
      nextCalls++;
    });
    assert.equal(refreshContext.status, 401);
    assert.equal(nextCalls, 0);

    const accessToken = jwt.sign({
      role: 'student',
      type: 'access',
      uid: 'user-id',
      username: 'student-a',
    }, secret);
    const accessContext = createContext(accessToken);
    await middleware(accessContext, async () => {
      nextCalls++;
    });
    assert.equal(nextCalls, 1);
    assert.equal(accessContext.auth.username, 'student-a');
  });

  it('allows a teacher to read a student resume only through the same activity choice', async () => {
    let choiceExists = false;
    const models = {
      Choose: {
        exists: async () => choiceExists,
      },
      UserInActivity: {
        exists: async () => true,
      },
    };
    const teacher = { role: 'teacher', username: 'teacher-a' };

    assert.equal(
      await canTeacherAccessStudent(models, teacher, 'student-a', 'activity-a'),
      false
    );
    choiceExists = true;
    assert.equal(
      await canTeacherAccessStudent(models, teacher, 'student-a', 'activity-a'),
      true
    );
  });

  it('validates exactly three unique teachers with orders one through three', () => {
    assert.deepEqual(normalizeChoices(choiceList()), choiceList());
    assert.equal(normalizeChoices(choiceList().slice(0, 2)), null);
    assert.equal(normalizeChoices([
      { order: 1, teacherId: 'teacher-a' },
      { order: 1, teacherId: 'teacher-b' },
      { order: 3, teacherId: 'teacher-c' },
    ]), null);
    assert.equal(normalizeChoices([
      { order: 1, teacherId: 'teacher-a' },
      { order: 2, teacherId: 'teacher-a' },
      { order: 3, teacherId: 'teacher-c' },
    ]), null);
  });

  it('treats a committed identical batch retry as idempotent', async () => {
    const activityId = '507f1f77bcf86cd799439011';
    const choices = choiceList();
    const fingerprint = choiceFingerprint('student-a', activityId, choices, 'accept');
    const existingChoices = choices.map(choice => ({
      ...choice,
      activityId,
      studentId: 'student-a',
    }));
    let inserts = 0;
    const duplicate = new Error('duplicate');
    duplicate.code = 11000;
    const ctx = {
      app: { config: { wxMiniApp: { subscribeTemplateId: 'template' } } },
      logger: { error() {} },
      model: {
        Activity: { findById: async () => activeActivity() },
        ChoiceSubmission: {
          create: async () => {
            throw duplicate;
          },
          findOne: async () => ({ fingerprint, status: 'committed' }),
        },
        Choose: {
          find: async () => existingChoices,
          insertMany: async () => {
            inserts++;
          },
        },
        Final: { countDocuments: async () => 0 },
        Student: { findOne: async () => ({ studentId: 'student-a' }) },
        Teacher: {
          find: async () => choices.map(choice => ({ teacherId: choice.teacherId })),
        },
        UserInActivity: {
          find: async () => choices.map(choice => ({
            maxSelectNum: 2,
            teacherId: choice.teacherId,
          })),
          findOne: async () => ({ studentId: 'student-a' }),
        },
      },
    };

    const result = await new StdinfoService(ctx).submitTeacherChoices({
      activityId,
      choices,
      studentId: 'student-a',
      subscribeStatus: 'accept',
    });

    assert.equal(result.code, 200);
    assert.equal(inserts, 0);
    assert.deepEqual(result.data, existingChoices);
  });

  it('removes partial writes and marks the batch failed when insertMany fails', async () => {
    const activityId = '507f1f77bcf86cd799439011';
    const choices = choiceList();
    const deletes = [];
    const submissionUpdates = [];
    let storedChoices = [];
    const ctx = {
      app: { config: { wxMiniApp: { subscribeTemplateId: 'template' } } },
      logger: { error() {} },
      model: {
        Activity: { findById: async () => activeActivity() },
        ChoiceSubmission: {
          create: async value => ({ _id: 'submission-1', ...value }),
          updateOne: async (filter, update) => {
            submissionUpdates.push({ filter, update });
          },
        },
        Choose: {
          async deleteMany(filter) {
            deletes.push(filter);
            storedChoices = storedChoices.filter(item => (
              item.activityId !== filter.activityId
              || item.studentId !== filter.studentId
              || item.submissionId !== filter.submissionId
            ));
          },
          find: async () => [],
          async insertMany(documents) {
            storedChoices.push(documents[0]);
            throw new Error('simulated partial batch write');
          },
        },
        Final: { countDocuments: async () => 0 },
        Student: { findOne: async () => ({ studentId: 'student-a' }) },
        Teacher: {
          find: async () => choices.map(choice => ({ teacherId: choice.teacherId })),
        },
        UserInActivity: {
          find: async () => choices.map(choice => ({
            maxSelectNum: 2,
            teacherId: choice.teacherId,
          })),
          findOne: async () => ({ studentId: 'student-a' }),
        },
      },
    };

    const result = await new StdinfoService(ctx).submitTeacherChoices({
      activityId,
      choices,
      studentId: 'student-a',
      subscribeStatus: '',
    });

    assert.equal(result.code, 500);
    assert.equal(deletes.length, 1);
    assert.equal(deletes[0].activityId, activityId);
    assert.equal(deletes[0].studentId, 'student-a');
    assert.match(deletes[0].submissionId, /^[0-9a-f-]{36}$/);
    assert.equal(storedChoices.length, 0);
    assert.equal(submissionUpdates[0].update.$set.status, 'failed');
  });

  it('keeps the shared finalization contract across admin and teacher entry points', async () => {
    const activityId = '507f1f77bcf86cd799439011';
    const scenarios = [
      {
        entry: 'admin',
        expectedOrder: 0,
        invoke: ctx => new AdminService(ctx).addFinal(
          activityId,
          'student-a',
          'teacher-a'
        ),
      },
      {
        entry: 'teacher',
        expectedOrder: 2,
        invoke: ctx => new TeainfoService(ctx).selectStudentAndUpdate(
          'student-a',
          'teacher-a',
          activityId
        ),
      },
    ];

    for (const scenario of scenarios) {
      const { calls, ctx } = finalizationFixture({ entry: scenario.entry });
      const result = await scenario.invoke(ctx);

      assert.equal(result.code, 201, scenario.entry);
      assert.deepEqual(calls.createdFinals, [{
        activityId,
        data: { name: 'Server Truth', phone: '13800000000' },
        order: scenario.expectedOrder,
        studentId: 'student-a',
        teacherId: 'teacher-a',
      }], scenario.entry);
      assert.equal(calls.createdReservations.length, 1, scenario.entry);
      assert.equal(calls.createdReservations[0].status, 'processing', scenario.entry);
      assert.equal(calls.reservationUpdates.length, 1, scenario.entry);
      assert.equal(
        calls.reservationUpdates[0].update.$set.status,
        'committed',
        scenario.entry
      );
      assert.equal(calls.deletedLocks.length, 1, scenario.entry);
      assert.equal(
        calls.deletedLocks[0].ownerToken,
        calls.createdReservations[0].ownerToken,
        scenario.entry
      );
      assert.equal(
        calls.chooseUpdates.length,
        scenario.entry === 'teacher' ? 1 : 0,
        scenario.entry
      );
    }
  });

  it('compensates owned finalization writes at both service entry points', async () => {
    const activityId = '507f1f77bcf86cd799439011';
    const scenarios = [
      {
        entry: 'admin',
        invoke: ctx => new AdminService(ctx).addFinal(
          activityId,
          'student-a',
          'teacher-a'
        ),
      },
      {
        entry: 'teacher',
        invoke: ctx => new TeainfoService(ctx).selectStudentAndUpdate(
          'student-a',
          'teacher-a',
          activityId
        ),
      },
    ];

    for (const scenario of scenarios) {
      const { calls, ctx } = finalizationFixture({
        entry: scenario.entry,
        failAfterFinal: true,
      });
      const operation = scenario.invoke(ctx);
      if (scenario.entry === 'admin') {
        await assert.rejects(operation, /simulated reservation write failure/);
      } else {
        const result = await operation;
        assert.equal(result.code, 500);
        assert.match(result.msg, /已回滚/);
      }

      assert.equal(calls.createdFinals.length, 1, scenario.entry);
      assert.equal(calls.deletedFinals.length, 1, scenario.entry);
      assert.equal(calls.deletedReservations.length, 1, scenario.entry);
      assert.equal(calls.deletedLocks.length, 1, scenario.entry);
      assert.equal(
        calls.deletedReservations[0].ownerToken,
        calls.createdReservations[0].ownerToken,
        scenario.entry
      );
    }
  });

  it('derives final data and order on the server and compensates a failed status update', async () => {
    const activityId = '507f1f77bcf86cd799439011';
    const deletedFinals = [];
    const deletedReservations = [];
    const createdFinals = [];
    const ctx = {
      app: { config: {} },
      logger: { error() {} },
      model: {
        Activity: { findById: async () => activeActivity() },
        Choose: {
          findOne: async () => ({ order: 2 }),
          findOneAndUpdate: async () => {
            throw new Error('simulated choose update failure');
          },
        },
        Final: {
          countDocuments: async () => 0,
          create: async value => {
            createdFinals.push(value);
            return value;
          },
          deleteOne: async value => {
            deletedFinals.push(value);
          },
          findOne: async () => null,
        },
        FinalReservation: {
          create: async value => ({ _id: 'reservation-1', ...value }),
          deleteOne: async value => {
            deletedReservations.push(value);
          },
        },
        Student: {
          findOne: async () => ({
            data: { name: 'Server Truth', phone: '13800000000' },
            studentId: 'student-a',
          }),
        },
        TeacherOperationLock: {
          create: async () => ({}),
          deleteOne: async () => ({}),
        },
        UserInActivity: {
          findOne: async query => (
            query.teacherId
              ? { maxSelectNum: 2, teacherId: query.teacherId }
              : { studentId: query.studentId }
          ),
        },
      },
    };

    const result = await new TeainfoService(ctx).selectStudentAndUpdate(
      'student-a',
      'teacher-a',
      activityId
    );

    assert.equal(result.code, 500);
    assert.deepEqual(createdFinals[0].data, {
      name: 'Server Truth',
      phone: '13800000000',
    });
    assert.equal(createdFinals[0].order, 2);
    assert.equal(deletedFinals.length, 1);
    assert.equal(deletedReservations.length, 1);
  });

  it('treats a committed successor as idempotent without rolling back its writes', async () => {
    const { calls, ctx } = finalizationFixture({
      entry: 'teacher',
      failReservationCommit: true,
    });

    const result = await new TeainfoService(ctx).selectStudentAndUpdate(
      'student-a',
      'teacher-a',
      '507f1f77bcf86cd799439011'
    );

    assert.equal(result.code, 200);
    assert.match(result.msg, /已录取/);
    assert.equal(calls.chooseUpdates.length, 1);
    assert.equal(calls.chooseUpdates[0].update.$set.isChose, true);
    assert.equal(calls.deletedFinals.length, 0);
    assert.equal(calls.deletedReservations.length, 0);
  });

  it('enforces the server-side teacher round window and configured quota', async () => {
    const activityId = '507f1f77bcf86cd799439011';
    let activity = activeActivity();
    let lockCreates = 0;
    const ctx = {
      app: { config: {} },
      logger: { error() {} },
      model: {
        Activity: { findById: async () => activity },
        Choose: { findOne: async () => ({ order: 1 }) },
        Final: {
          countDocuments: async () => 0,
          findOne: async () => null,
        },
        Student: {
          findOne: async () => ({ data: {}, studentId: 'student-a' }),
        },
        TeacherOperationLock: {
          create: async () => {
            lockCreates++;
          },
          deleteOne: async () => ({}),
        },
        UserInActivity: {
          findOne: async query => (
            query.teacherId
              ? { maxSelectNum: 0, teacherId: query.teacherId }
              : { studentId: query.studentId }
          ),
        },
      },
    };
    const service = new TeainfoService(ctx);

    activity = {
      ...activeActivity(),
      firstChooseEndDate: new Date(Date.now() - 60_000),
      firstChooseStartDate: new Date(Date.now() - 120_000),
    };
    const outsideWindow = await service.selectStudentAndUpdate(
      'student-a',
      'teacher-a',
      activityId
    );
    assert.equal(outsideWindow.code, 400);
    assert.equal(lockCreates, 0);

    activity = activeActivity();
    const noQuota = await service.selectStudentAndUpdate(
      'student-a',
      'teacher-a',
      activityId
    );
    assert.equal(noQuota.code, 409);
    assert.match(noQuota.msg, /名额/);
    assert.equal(lockCreates, 1);
  });
});
