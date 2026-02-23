import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "campus_brain_local_db_v1";
const DB_VERSION = 1;

const isoDate = (daysBack = 0) => {
  const date = new Date();
  date.setDate(date.getDate() - daysBack);
  return date.toISOString().slice(0, 10);
};

const DEMO_USER = {
  id: "user_demo",
  name: "Demo Student",
  email: "demo@campusbrain.ai",
  password: "demo123",
  isMock: true,
};

const mockSubjectsFor = (userId) => [
  {
    id: `sub_math_${userId}`,
    userId,
    name: "Mathematics",
    requiredAttendance: 75,
    isMock: true,
    createdAt: `${isoDate(6)}T10:00:00.000Z`,
  },
  {
    id: `sub_physics_${userId}`,
    userId,
    name: "Physics",
    requiredAttendance: 75,
    isMock: true,
    createdAt: `${isoDate(6)}T10:05:00.000Z`,
  },
  {
    id: `sub_ai_${userId}`,
    userId,
    name: "AI Foundations",
    requiredAttendance: 80,
    isMock: true,
    createdAt: `${isoDate(6)}T10:10:00.000Z`,
  },
];

const mockAttendanceFor = (userId) => [
  {
    id: `att_01_${userId}`,
    userId,
    subjectId: `sub_math_${userId}`,
    date: isoDate(5),
    lectureName: "L1",
    status: "present",
    isMock: true,
    createdAt: `${isoDate(5)}T09:30:00.000Z`,
  },
  {
    id: `att_02_${userId}`,
    userId,
    subjectId: `sub_math_${userId}`,
    date: isoDate(4),
    lectureName: "L2",
    status: "absent",
    isMock: true,
    createdAt: `${isoDate(4)}T09:30:00.000Z`,
  },
  {
    id: `att_03_${userId}`,
    userId,
    subjectId: `sub_physics_${userId}`,
    date: isoDate(3),
    lectureName: "L1",
    status: "present",
    isMock: true,
    createdAt: `${isoDate(3)}T10:45:00.000Z`,
  },
  {
    id: `att_04_${userId}`,
    userId,
    subjectId: `sub_physics_${userId}`,
    date: isoDate(2),
    lectureName: "L2",
    status: "present",
    isMock: true,
    createdAt: `${isoDate(2)}T10:45:00.000Z`,
  },
  {
    id: `att_05_${userId}`,
    userId,
    subjectId: `sub_ai_${userId}`,
    date: isoDate(1),
    lectureName: "L1",
    status: "present",
    isMock: true,
    createdAt: `${isoDate(1)}T13:00:00.000Z`,
  },
  {
    id: `att_06_${userId}`,
    userId,
    subjectId: `sub_ai_${userId}`,
    date: isoDate(0),
    lectureName: "L2",
    status: "absent",
    isMock: true,
    createdAt: `${isoDate(0)}T13:00:00.000Z`,
  },
];

const emptyDb = () => ({
  version: DB_VERSION,
  users: [],
  subjects: [],
  attendanceRecords: [],
  settings: {
    aiKey: "",
  },
  meta: {
    createdAt: new Date().toISOString(),
    mockFallbackActive: true,
  },
});

const normalizeDb = (raw) => {
  const base = emptyDb();
  if (!raw || typeof raw !== "object") return base;

  return {
    version: raw.version || DB_VERSION,
    users: Array.isArray(raw.users) ? raw.users : [],
    subjects: Array.isArray(raw.subjects) ? raw.subjects : [],
    attendanceRecords: Array.isArray(raw.attendanceRecords)
      ? raw.attendanceRecords
      : [],
    settings: {
      aiKey: raw.settings?.aiKey || "",
    },
    meta: {
      createdAt: raw.meta?.createdAt || new Date().toISOString(),
      mockFallbackActive: Boolean(raw.meta?.mockFallbackActive),
    },
  };
};

const ensureMockRecordsAvailable = (db) => {
  const next = normalizeDb(db);
  const hasDemoUser = next.users.some((user) => user.id === DEMO_USER.id);

  if (!hasDemoUser) {
    next.users = [...next.users, DEMO_USER];
  }

  const hasDemoSubjects = next.subjects.some(
    (subject) => subject.userId === DEMO_USER.id
  );
  if (!hasDemoSubjects) {
    next.subjects = [...next.subjects, ...mockSubjectsFor(DEMO_USER.id)];
  }

  const hasDemoAttendance = next.attendanceRecords.some(
    (entry) => entry.userId === DEMO_USER.id
  );
  if (!hasDemoAttendance) {
    next.attendanceRecords = [...next.attendanceRecords, ...mockAttendanceFor(DEMO_USER.id)];
  }

  return next;
};

const hasRealData = (db) =>
  db.users.some((user) => !user.isMock) &&
  db.subjects.some((subject) => !subject.isMock) &&
  db.attendanceRecords.some((entry) => !entry.isMock);

export const isMockModeActive = (db) => {
  if (!db) return true;
  const aiKeySet = Boolean(db.settings?.aiKey?.trim());
  return !(aiKeySet && hasRealData(db));
};

const withMockPolicy = (db) => {
  const next = ensureMockRecordsAvailable(db);
  next.meta.mockFallbackActive = isMockModeActive(next);
  return next;
};

export const loadOrCreateDatabase = async () => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = withMockPolicy(emptyDb());
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }

    const parsed = normalizeDb(JSON.parse(raw));
    const updated = withMockPolicy(parsed);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    const fallback = withMockPolicy(emptyDb());
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(fallback));
    return fallback;
  }
};

export const saveDatabase = async (db) => {
  const updated = withMockPolicy(db);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
};

export const resetDatabaseWithMock = async () => {
  const seeded = withMockPolicy(emptyDb());
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
  return seeded;
};

export const createId = (prefix) =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export const createStarterDataForUser = (userId) => {
  const seededSubjects = mockSubjectsFor(userId);
  const createdSubjects = seededSubjects.map((subject) => ({
    ...subject,
    isMock: true,
    id: createId("sub"),
  }));
  const subjectByName = new Map(createdSubjects.map((subject) => [subject.name, subject.id]));

  const attendanceRecords = mockAttendanceFor(userId).map((entry) => {
    const matchSubject = seededSubjects.find((subject) => subject.id === entry.subjectId);
    const subjectId = subjectByName.get(matchSubject?.name || "") || createdSubjects[0].id;
    return {
      ...entry,
      isMock: true,
      id: createId("att"),
      subjectId,
    };
  });

  return {
    subjects: createdSubjects,
    attendanceRecords,
  };
};

export const demoCredentials = {
  email: DEMO_USER.email,
  password: DEMO_USER.password,
};
