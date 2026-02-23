import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import AttendancePie from "./src/components/AttendancePie";
import CyberBackground from "./src/components/CyberBackground";
import {
  createId,
  createStarterDataForUser,
  demoCredentials,
  isMockModeActive,
  loadOrCreateDatabase,
  resetDatabaseWithMock,
  saveDatabase,
} from "./src/storage/localDb";
import {
  attendanceColor,
  buildOverview,
  buildSubjectMetrics,
} from "./src/utils/attendance";

const today = () => new Date().toISOString().slice(0, 10);
const screens = [
  { id: "dashboard", label: "Dashboard" },
  { id: "attendance", label: "Attendance" },
  { id: "settings", label: "Settings" },
];

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || "http://10.0.2.2:5000/api";

const defaultOverview = {
  totalSubjects: 0,
  atRiskSubjects: 0,
  overallAttendance: 100,
  overallTone: attendanceColor(100),
};

const apiRequest = async (path, { method = "GET", token, body } = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  let data = null;
  try {
    data = await response.json();
  } catch (error) {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.message || "Request failed");
  }

  return data;
};

const mapRemoteSubject = (subject) => ({
  id: subject._id,
  name: subject.name,
  requiredAttendance: subject.requiredAttendance,
  metrics: {
    ...(subject.metrics || {}),
    tone: attendanceColor(subject?.metrics?.attendancePercentage ?? 100),
  },
});

const mapRemoteAttendance = (entry) => ({
  id: entry._id,
  subjectId: entry.subject?._id || "",
  subjectName: entry.subject?.name || "Unknown Subject",
  date: new Date(entry.date).toISOString().slice(0, 10),
  lectureName: entry.lectureName || "L1",
  status: entry.status,
});

const LabelInput = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  secureTextEntry,
}) => (
  <View style={styles.inputBlock}>
    <Text style={styles.inputLabel}>{label}</Text>
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="rgba(154, 170, 214, 0.46)"
      style={styles.input}
      keyboardType={keyboardType}
      autoCapitalize="none"
      secureTextEntry={secureTextEntry}
    />
  </View>
);

const NeonButton = ({ label, onPress, variant = "primary", disabled = false }) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    style={({ pressed }) => [
      styles.button,
      variant === "secondary" ? styles.buttonSecondary : styles.buttonPrimary,
      disabled ? styles.buttonDisabled : null,
      pressed ? styles.buttonPressed : null,
    ]}
  >
    <Text
      style={[
        styles.buttonText,
        variant === "secondary" ? styles.buttonTextSecondary : null,
      ]}
    >
      {label}
    </Text>
  </Pressable>
);

const TabButton = ({ isActive, label, onPress }) => (
  <Pressable
    onPress={onPress}
    style={[styles.tabButton, isActive ? styles.tabButtonActive : null]}
  >
    <Text style={[styles.tabText, isActive ? styles.tabTextActive : null]}>{label}</Text>
  </Pressable>
);

const DashboardScreen = ({ overview, subjectStats }) => (
  <ScrollView contentContainerStyle={styles.screenScroll}>
    <LinearGradient
      colors={["rgba(8,18,43,0.86)", "rgba(11,31,84,0.73)", "rgba(8,18,43,0.86)"]}
      style={[styles.panel, styles.heroPanel]}
    >
      <View style={styles.heroTextWrap}>
        <Text style={styles.heroTitle}>Campus Brain Core</Text>
        <Text style={styles.heroSubtitle}>AI-styled attendance intelligence on device</Text>
        <View style={styles.heroStatsRow}>
          <View>
            <Text style={styles.heroMetricValue}>{overview.totalSubjects}</Text>
            <Text style={styles.heroMetricLabel}>Subjects</Text>
          </View>
          <View>
            <Text style={styles.heroMetricValue}>{overview.atRiskSubjects}</Text>
            <Text style={styles.heroMetricLabel}>At Risk</Text>
          </View>
        </View>
      </View>
      <AttendancePie
        percentage={overview.overallAttendance}
        label="Overall"
        primaryColor={overview.overallTone}
        secondaryColor="#3b89ff"
      />
    </LinearGradient>

    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Subject Heatmap</Text>
      {subjectStats.length === 0 ? (
        <Text style={styles.emptyText}>No subjects yet. Add one in Attendance screen.</Text>
      ) : (
        subjectStats.map((subject) => (
          <View key={subject.id} style={styles.subjectCard}>
            <View
              style={[
                styles.subjectGlowStrip,
                { backgroundColor: subject.metrics.tone, shadowColor: subject.metrics.tone },
              ]}
            />
            <View style={styles.subjectBody}>
              <View style={styles.subjectHeaderRow}>
                <Text style={styles.subjectTitle}>{subject.name}</Text>
                <View
                  style={[
                    styles.riskBadge,
                    {
                      borderColor: subject.metrics.tone,
                      backgroundColor: `${subject.metrics.tone}22`,
                    },
                  ]}
                >
                  <Text style={[styles.riskText, { color: subject.metrics.tone }]}>
                    {subject.metrics.attendancePercentage.toFixed(1)}%
                  </Text>
                </View>
              </View>
              <Text style={styles.subjectMeta}>
                {subject.metrics.attendedClasses}/{subject.metrics.totalClasses} lectures present
              </Text>
              <Text style={styles.subjectMeta}>
                Can miss: {subject.metrics.maxMissBeforeThreshold} | Required: {" "}
                {subject.metrics.requiredAttendance}%
              </Text>
              {subject.metrics.classesNeededToRecover > 0 ? (
                <Text style={[styles.subjectMeta, { color: "#ff8b8b" }]}>
                  Need {subject.metrics.classesNeededToRecover} straight classes to recover.
                </Text>
              ) : null}
            </View>
          </View>
        ))
      )}
    </View>
  </ScrollView>
);

const AttendanceScreen = ({
  subjectForm,
  setSubjectForm,
  attendanceForm,
  setAttendanceForm,
  subjectStats,
  selectedSubjectId,
  setSelectedSubjectId,
  sortedRecords,
  onCreateSubject,
  onSaveAttendance,
  onDeleteAttendance,
}) => {
  const selectedSubject =
    subjectStats.find((subject) => subject.id === selectedSubjectId) || subjectStats[0] || null;

  return (
    <ScrollView contentContainerStyle={styles.screenScroll}>
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Attendance Calculator</Text>
        {selectedSubject ? (
          <View style={styles.calcWrap}>
            <AttendancePie
              percentage={selectedSubject.metrics.attendancePercentage}
              label={selectedSubject.name}
              size={142}
              primaryColor={selectedSubject.metrics.tone}
              secondaryColor="#316bff"
            />
            <View style={styles.calcStats}>
              <Text style={styles.calcLine}>Present: {selectedSubject.metrics.attendedClasses}</Text>
              <Text style={styles.calcLine}>Total: {selectedSubject.metrics.totalClasses}</Text>
              <Text style={styles.calcLine}>
                Can miss: {selectedSubject.metrics.maxMissBeforeThreshold}
              </Text>
              <Text style={styles.calcLine}>
                Recovery: {selectedSubject.metrics.classesNeededToRecover}
              </Text>
            </View>
          </View>
        ) : (
          <Text style={styles.emptyText}>Create a subject to start calculating attendance.</Text>
        )}
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Add Subject</Text>
        <LabelInput
          label="Subject Name"
          value={subjectForm.name}
          onChangeText={(text) => setSubjectForm((prev) => ({ ...prev, name: text }))}
          placeholder="e.g. Data Structures"
        />
        <LabelInput
          label="Required Attendance %"
          value={subjectForm.requiredAttendance}
          onChangeText={(text) =>
            setSubjectForm((prev) => ({ ...prev, requiredAttendance: text }))
          }
          placeholder="75"
          keyboardType="numeric"
        />
        <NeonButton label="Create Subject" onPress={onCreateSubject} />
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Daily Lecture Record</Text>
        <View style={styles.subjectChipWrap}>
          {subjectStats.map((subject) => (
            <Pressable
              key={subject.id}
              onPress={() => {
                setSelectedSubjectId(subject.id);
                setAttendanceForm((prev) => ({ ...prev, subjectId: subject.id }));
              }}
              style={[
                styles.subjectChip,
                attendanceForm.subjectId === subject.id ? styles.subjectChipSelected : null,
                attendanceForm.subjectId === subject.id
                  ? { borderColor: subject.metrics.tone }
                  : null,
              ]}
            >
              <Text
                style={[
                  styles.subjectChipText,
                  attendanceForm.subjectId === subject.id
                    ? { color: subject.metrics.tone }
                    : null,
                ]}
              >
                {subject.name}
              </Text>
            </Pressable>
          ))}
        </View>

        <LabelInput
          label="Date (YYYY-MM-DD)"
          value={attendanceForm.date}
          onChangeText={(text) => setAttendanceForm((prev) => ({ ...prev, date: text }))}
          placeholder="2026-02-23"
        />
        <LabelInput
          label="Lecture (example: L1)"
          value={attendanceForm.lectureName}
          onChangeText={(text) =>
            setAttendanceForm((prev) => ({ ...prev, lectureName: text }))
          }
          placeholder="L1"
        />

        <View style={styles.statusSwitch}>
          <Pressable
            onPress={() => setAttendanceForm((prev) => ({ ...prev, status: "present" }))}
            style={[
              styles.statusButton,
              attendanceForm.status === "present" ? styles.statusButtonPresent : null,
            ]}
          >
            <Text
              style={[
                styles.statusButtonText,
                attendanceForm.status === "present" ? styles.statusButtonTextActive : null,
              ]}
            >
              Present
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setAttendanceForm((prev) => ({ ...prev, status: "absent" }))}
            style={[
              styles.statusButton,
              attendanceForm.status === "absent" ? styles.statusButtonAbsent : null,
            ]}
          >
            <Text
              style={[
                styles.statusButtonText,
                attendanceForm.status === "absent" ? styles.statusButtonTextActive : null,
              ]}
            >
              Absent
            </Text>
          </Pressable>
        </View>
        <NeonButton label="Save Lecture Record" onPress={onSaveAttendance} />
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Lecture Log</Text>
        {sortedRecords.length === 0 ? (
          <Text style={styles.emptyText}>No lecture records yet.</Text>
        ) : (
          sortedRecords.map((entry) => {
            const tone = entry.status === "present" ? "#4ee58e" : "#ff6677";
            return (
              <View key={entry.id} style={styles.recordRow}>
                <View style={[styles.recordDot, { backgroundColor: tone }]} />
                <View style={styles.recordInfo}>
                  <Text style={styles.recordTitle}>
                    {entry.subjectName} | {entry.lectureName || "L1"} | {entry.status}
                  </Text>
                  <Text style={styles.recordMeta}>{entry.date}</Text>
                </View>
                <Pressable onPress={() => onDeleteAttendance(entry.id)} style={styles.deleteChip}>
                  <Text style={styles.deleteChipText}>Delete</Text>
                </Pressable>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
};

const SettingsScreen = ({
  dataMode,
  onSwitchMode,
  aiKey,
  setAiKey,
  onSaveAiKey,
  onResetMock,
  mockMode,
  localUsersCount,
  serverUrl,
}) => (
  <ScrollView contentContainerStyle={styles.screenScroll}>
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Runtime Mode</Text>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Current Mode</Text>
        <Text
          style={[
            styles.infoValue,
            { color: dataMode === "server" ? "#45f0b1" : "#ff9d57" },
          ]}
        >
          {dataMode === "server" ? "SERVER" : "DEVICE"}
        </Text>
      </View>
      <NeonButton
        label={dataMode === "server" ? "Switch To Device Mode" : "Switch To Server Mode"}
        variant="secondary"
        onPress={onSwitchMode}
      />

      {dataMode === "server" ? (
        <>
          <Text style={styles.settingsText}>
            Original app workflow active. Authentication, subjects, and attendance are synced
            with backend API.
          </Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>API URL</Text>
            <Text style={styles.infoValueSmall}>{serverUrl}</Text>
          </View>
        </>
      ) : (
        <>
          <Text style={styles.settingsText}>
            Device storage mode is active. Until AI key and real personal data are set, mock
            demo records remain available.
          </Text>
          <LabelInput
            label="OpenAI Key (stored locally on this device)"
            value={aiKey}
            onChangeText={setAiKey}
            placeholder="sk-..."
            secureTextEntry
          />
          <NeonButton label="Save AI Key" onPress={onSaveAiKey} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Mock status</Text>
            <Text style={[styles.infoValue, { color: mockMode ? "#ff9d57" : "#45f0b1" }]}>
              {mockMode ? "ACTIVE" : "OFF"}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Local Users</Text>
            <Text style={styles.infoValue}>{localUsersCount}</Text>
          </View>
          <NeonButton
            label="Reset Database To Mock"
            variant="secondary"
            onPress={onResetMock}
          />
        </>
      )}
    </View>
  </ScrollView>
);

export default function App() {
  const [db, setDb] = useState(null);
  const dbRef = useRef(null);
  const [dataMode, setDataMode] = useState("server");
  const [serverToken, setServerToken] = useState("");
  const [serverUser, setServerUser] = useState(null);
  const [serverSubjectStats, setServerSubjectStats] = useState([]);
  const [serverSortedRecords, setServerSortedRecords] = useState([]);
  const [serverOverview, setServerOverview] = useState(defaultOverview);
  const [isLoading, setIsLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [currentUserId, setCurrentUserId] = useState("");
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [activeScreen, setActiveScreen] = useState("dashboard");
  const [subjectForm, setSubjectForm] = useState({ name: "", requiredAttendance: "75" });
  const [attendanceForm, setAttendanceForm] = useState({
    subjectId: "",
    date: today(),
    lectureName: "L1",
    status: "present",
  });
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [aiKeyInput, setAiKeyInput] = useState("");

  const floatingAnim = useRef(new Animated.Value(0)).current;
  const screenAppear = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const boot = async () => {
      const loaded = await loadOrCreateDatabase();
      dbRef.current = loaded;
      setDb(loaded);
      setAiKeyInput(loaded.settings.aiKey || "");
      setIsLoading(false);
    };
    boot();
  }, []);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(""), 2500);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatingAnim, {
          toValue: 1,
          duration: 2800,
          useNativeDriver: true,
        }),
        Animated.timing(floatingAnim, {
          toValue: 0,
          duration: 2800,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [floatingAnim]);

  useEffect(() => {
    screenAppear.setValue(0);
    Animated.timing(screenAppear, {
      toValue: 1,
      duration: 340,
      useNativeDriver: true,
    }).start();
  }, [activeScreen, screenAppear]);

  const localCurrentUser = useMemo(
    () => db?.users.find((user) => user.id === currentUserId) || null,
    [db, currentUserId]
  );

  const localUserSubjects = useMemo(
    () =>
      (db?.subjects || [])
        .filter((subject) => subject.userId === currentUserId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [db, currentUserId]
  );

  const localUserRecords = useMemo(
    () => (db?.attendanceRecords || []).filter((entry) => entry.userId === currentUserId),
    [db, currentUserId]
  );

  const localSubjectStats = useMemo(
    () => buildSubjectMetrics(localUserSubjects, localUserRecords),
    [localUserSubjects, localUserRecords]
  );
  const localOverview = useMemo(
    () => buildOverview(localSubjectStats),
    [localSubjectStats]
  );
  const localSortedRecords = useMemo(() => {
    const subjectMap = new Map(localSubjectStats.map((subject) => [subject.id, subject.name]));
    return localUserRecords
      .map((entry) => ({
        ...entry,
        subjectName: subjectMap.get(entry.subjectId) || "Unknown Subject",
      }))
      .sort((a, b) => {
        const dateDiff =
          new Date(`${b.date}T23:59:59`).getTime() - new Date(`${a.date}T23:59:59`).getTime();
        if (dateDiff !== 0) return dateDiff;
        return (a.lectureName || "").localeCompare(b.lectureName || "");
      });
  }, [localSubjectStats, localUserRecords]);

  const currentUser = dataMode === "server" ? serverUser : localCurrentUser;
  const subjectStats = dataMode === "server" ? serverSubjectStats : localSubjectStats;
  const overview = dataMode === "server" ? serverOverview : localOverview;
  const sortedRecords =
    dataMode === "server" ? serverSortedRecords : localSortedRecords;
  const mockMode = dataMode === "local" ? isMockModeActive(db) : false;

  const refreshRemoteData = async (tokenArg = serverToken) => {
    if (!tokenArg) return;

    const [dashboardData, attendanceData] = await Promise.all([
      apiRequest("/dashboard/overview", { token: tokenArg }),
      apiRequest("/attendance", { token: tokenArg }),
    ]);

    const mappedSubjects = (dashboardData.subjects || []).map(mapRemoteSubject);
    const mappedOverview = {
      ...(dashboardData.overview || defaultOverview),
      overallTone: attendanceColor(dashboardData?.overview?.overallAttendance ?? 100),
    };
    const mappedRecords = (attendanceData.entries || [])
      .map(mapRemoteAttendance)
      .sort((a, b) => {
        const dateDiff =
          new Date(`${b.date}T23:59:59`).getTime() - new Date(`${a.date}T23:59:59`).getTime();
        if (dateDiff !== 0) return dateDiff;
        return (a.lectureName || "").localeCompare(b.lectureName || "");
      });

    setServerSubjectStats(mappedSubjects);
    setServerOverview(mappedOverview);
    setServerSortedRecords(mappedRecords);
  };

  useEffect(() => {
    if (!currentUser) return;
    if (subjectStats.length === 0) {
      setSelectedSubjectId("");
      setAttendanceForm((prev) => ({ ...prev, subjectId: "" }));
      return;
    }
    if (!subjectStats.some((subject) => subject.id === selectedSubjectId)) {
      const fallback = subjectStats[0].id;
      setSelectedSubjectId(fallback);
      setAttendanceForm((prev) => ({ ...prev, subjectId: fallback }));
    }
  }, [currentUser, selectedSubjectId, subjectStats]);

  const commitDb = async (transformer, successMessage = "") => {
    try {
      const current = dbRef.current;
      if (!current) return;
      const next = typeof transformer === "function" ? transformer(current) : transformer;
      const saved = await saveDatabase(next);
      dbRef.current = saved;
      setDb(saved);
      if (successMessage) setNotice(successMessage);
      setError("");
    } catch (storageError) {
      setError("Failed to save data on this device.");
    }
  };

  const handleAuth = async () => {
    if (!db) return;
    setError("");
    const email = authForm.email.trim().toLowerCase();
    if (!email || !authForm.password.trim()) {
      setError("Email and password are required.");
      return;
    }

    if (dataMode === "server") {
      if (!serverToken) {
        setError("Session expired. Login again.");
        return;
      }
      try {
        setIsDataLoading(true);

        if (authMode === "register" && !authForm.name.trim()) {
          setError("Name is required.");
          return;
        }

        const endpoint = authMode === "register" ? "/auth/register" : "/auth/login";
        const payload =
          authMode === "register"
            ? {
                name: authForm.name.trim(),
                email,
                password: authForm.password.trim(),
              }
            : { email, password: authForm.password.trim() };

        const data = await apiRequest(endpoint, { method: "POST", body: payload });
        setServerToken(data.token);
        setServerUser(data.user);
        await refreshRemoteData(data.token);
        setNotice(authMode === "register" ? "Account created on server." : "Server login successful.");
        setAuthForm((prev) => ({ ...prev, name: "", password: "" }));
      } catch (authError) {
        setError(
          `${authError.message}. If backend is down, switch to Device mode for local/mock data.`
        );
      } finally {
        setIsDataLoading(false);
      }
      return;
    }

    if (authMode === "register") {
      if (!authForm.name.trim()) {
        setError("Name is required.");
        return;
      }

      if (db.users.some((user) => user.email.toLowerCase() === email)) {
        setError("Email already exists.");
        return;
      }

      const userId = createId("user");
      const starter = !db.settings.aiKey?.trim()
        ? createStarterDataForUser(userId)
        : { subjects: [], attendanceRecords: [] };

      await commitDb(
        (current) => ({
          ...current,
          users: [
            ...current.users,
            {
              id: userId,
              name: authForm.name.trim(),
              email,
              password: authForm.password.trim(),
              isMock: false,
              createdAt: new Date().toISOString(),
            },
          ],
          subjects: [...current.subjects, ...starter.subjects],
          attendanceRecords: [...current.attendanceRecords, ...starter.attendanceRecords],
        }),
        "Account created on local storage."
      );

      setCurrentUserId(userId);
      setAuthForm((prev) => ({ ...prev, name: "", password: "" }));
      return;
    }

    const matched = db.users.find(
      (user) =>
        user.email.toLowerCase() === email && user.password === authForm.password.trim()
    );
    if (!matched) {
      setError("Invalid credentials.");
      return;
    }

    setCurrentUserId(matched.id);
    setNotice(matched.isMock ? "Demo profile loaded from mock data." : "Welcome back.");
    setAuthForm((prev) => ({ ...prev, password: "" }));
  };

  const handleDemoLogin = () => {
    if (!db || dataMode !== "local") return;
    const demo = db.users.find((user) => user.email === demoCredentials.email);
    if (!demo) return;
    setCurrentUserId(demo.id);
    setNotice("Demo mode active with mock records.");
  };

  const handleCreateSubject = async () => {
    if (!db) return;
    const name = subjectForm.name.trim();
    const requiredAttendance = Number(subjectForm.requiredAttendance || 75);

    if (!name) {
      setError("Subject name is required.");
      return;
    }

    if (Number.isNaN(requiredAttendance) || requiredAttendance < 50 || requiredAttendance > 100) {
      setError("Required attendance must be between 50 and 100.");
      return;
    }

    if (dataMode === "server") {
      if (!serverToken) {
        setError("Session expired. Login again.");
        return;
      }
      try {
        setIsDataLoading(true);
        await apiRequest("/subjects", {
          method: "POST",
          token: serverToken,
          body: {
            name,
            requiredAttendance,
          },
        });
        await refreshRemoteData();
        setNotice("Subject added on server.");
        setSubjectForm({ name: "", requiredAttendance: "75" });
      } catch (createError) {
        setError(createError.message);
      } finally {
        setIsDataLoading(false);
      }
      return;
    }

    if (!currentUserId) return;
    await commitDb(
      (current) => ({
        ...current,
        subjects: [
          ...current.subjects,
          {
            id: createId("sub"),
            userId: currentUserId,
            name,
            requiredAttendance,
            isMock: false,
            createdAt: new Date().toISOString(),
          },
        ],
      }),
      "Subject added."
    );

    setSubjectForm({ name: "", requiredAttendance: "75" });
  };

  const handleSaveAttendance = async () => {
    if (!db) return;
    if (!attendanceForm.subjectId) {
      setError("Select a subject.");
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(attendanceForm.date)) {
      setError("Date format must be YYYY-MM-DD.");
      return;
    }

    const lectureName = attendanceForm.lectureName.trim() || "L1";

    if (dataMode === "server") {
      try {
        setIsDataLoading(true);
        await apiRequest("/attendance", {
          method: "POST",
          token: serverToken,
          body: {
            subjectId: attendanceForm.subjectId,
            date: attendanceForm.date,
            status: attendanceForm.status,
            lectureName,
          },
        });
        await refreshRemoteData();
        setNotice("Attendance saved on server.");
      } catch (attendanceError) {
        setError(attendanceError.message);
      } finally {
        setIsDataLoading(false);
      }
      return;
    }

    if (!currentUserId) return;
    await commitDb(
      (current) => {
        const existing = current.attendanceRecords.find(
          (entry) =>
            entry.userId === currentUserId &&
            entry.subjectId === attendanceForm.subjectId &&
            entry.date === attendanceForm.date &&
            (entry.lectureName || "L1").toLowerCase() === lectureName.toLowerCase()
        );

        if (existing) {
          return {
            ...current,
            attendanceRecords: current.attendanceRecords.map((entry) =>
              entry.id === existing.id
                ? {
                    ...entry,
                    status: attendanceForm.status,
                    lectureName,
                    isMock: false,
                  }
                : entry
            ),
          };
        }

        return {
          ...current,
          attendanceRecords: [
            ...current.attendanceRecords,
            {
              id: createId("att"),
              userId: currentUserId,
              subjectId: attendanceForm.subjectId,
              date: attendanceForm.date,
              lectureName,
              status: attendanceForm.status,
              isMock: false,
              createdAt: new Date().toISOString(),
            },
          ],
        };
      },
      "Attendance saved."
    );
  };

  const handleDeleteAttendance = async (entryId) => {
    if (dataMode === "server") {
      if (!serverToken) {
        setError("Session expired. Login again.");
        return;
      }
      try {
        setIsDataLoading(true);
        await apiRequest(`/attendance/${entryId}`, {
          method: "DELETE",
          token: serverToken,
        });
        await refreshRemoteData();
        setNotice("Attendance record removed.");
      } catch (deleteError) {
        setError(deleteError.message);
      } finally {
        setIsDataLoading(false);
      }
      return;
    }

    await commitDb(
      (current) => ({
        ...current,
        attendanceRecords: current.attendanceRecords.filter((entry) => entry.id !== entryId),
      }),
      "Attendance record removed."
    );
  };

  const handleSaveAiKey = async () => {
    await commitDb(
      (current) => ({
        ...current,
        settings: {
          ...current.settings,
          aiKey: aiKeyInput.trim(),
        },
      }),
      "AI key saved locally."
    );
  };

  const handleResetMock = async () => {
    const seeded = await resetDatabaseWithMock();
    dbRef.current = seeded;
    setDb(seeded);
    setCurrentUserId("");
    setAuthMode("login");
    setAuthForm((prev) => ({
      ...prev,
      email: demoCredentials.email,
      password: demoCredentials.password,
    }));
    setNotice("Database reset to mock mode.");
  };

  const handleSwitchMode = () => {
    const nextMode = dataMode === "server" ? "local" : "server";
    setDataMode(nextMode);
    setError("");
    setNotice(
      nextMode === "server"
        ? "Switched to Server mode. Login to continue."
        : "Switched to Device mode. Login or use Demo."
    );
    setAuthMode("login");
    setActiveScreen("dashboard");
    setSelectedSubjectId("");
    setServerToken("");
    setServerUser(null);
    setServerSubjectStats([]);
    setServerSortedRecords([]);
    setServerOverview(defaultOverview);
    setCurrentUserId("");
    setAuthForm({
      name: "",
      email: nextMode === "local" ? demoCredentials.email : "",
      password: nextMode === "local" ? demoCredentials.password : "",
    });
  };

  const handleLogout = () => {
    setCurrentUserId("");
    setServerToken("");
    setServerUser(null);
    setServerSubjectStats([]);
    setServerSortedRecords([]);
    setServerOverview(defaultOverview);
    setActiveScreen("dashboard");
    setNotice("Logged out.");
  };

  const floatY = floatingAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });
  const screenTranslate = screenAppear.interpolate({
    inputRange: [0, 1],
    outputRange: [12, 0],
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <CyberBackground />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#49d4ff" />
          <Text style={styles.loadingText}>Initializing Campus Brain...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!currentUser) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <CyberBackground />
        <KeyboardAvoidingView
          style={styles.authWrap}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Animated.View
            style={[
              styles.authPanel,
              {
                transform: [
                  { translateY: floatY },
                  { perspective: 900 },
                  { rotateX: "3deg" },
                ],
              },
            ]}
          >
            <Text style={styles.brandTitle}>Campus Brain</Text>
            <Text style={styles.brandSubtitle}>Science x Cyberpunk x AI Attendance Tracker</Text>
            <View style={styles.modeToggleWrap}>
              <Pressable
                onPress={() => {
                  setDataMode("server");
                  setAuthMode("login");
                  setError("");
                  setAuthForm((prev) => ({ ...prev, name: "", email: "", password: "" }));
                }}
                style={[
                  styles.modeToggleButton,
                  dataMode === "server" ? styles.modeToggleButtonActive : null,
                ]}
              >
                <Text
                  style={[
                    styles.modeToggleText,
                    dataMode === "server" ? styles.modeToggleTextActive : null,
                  ]}
                >
                  Server
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setDataMode("local");
                  setAuthMode("login");
                  setError("");
                  setAuthForm({
                    name: "",
                    email: demoCredentials.email,
                    password: demoCredentials.password,
                  });
                }}
                style={[
                  styles.modeToggleButton,
                  dataMode === "local" ? styles.modeToggleButtonActive : null,
                ]}
              >
                <Text
                  style={[
                    styles.modeToggleText,
                    dataMode === "local" ? styles.modeToggleTextActive : null,
                  ]}
                >
                  Device
                </Text>
              </Pressable>
            </View>
            <Text style={styles.mockHint}>
              {dataMode === "server"
                ? "Server mode keeps the original app behavior through backend APIs."
                : "Device mode uses local storage with mock data until AI key + real data exist."}
            </Text>

            {authMode === "register" ? (
              <LabelInput
                label="Name"
                value={authForm.name}
                onChangeText={(text) => setAuthForm((prev) => ({ ...prev, name: text }))}
                placeholder="Your name"
              />
            ) : null}

            <LabelInput
              label="Email"
              value={authForm.email}
              onChangeText={(text) => setAuthForm((prev) => ({ ...prev, email: text }))}
              placeholder="you@example.com"
              keyboardType="email-address"
            />
            <LabelInput
              label="Password"
              value={authForm.password}
              onChangeText={(text) => setAuthForm((prev) => ({ ...prev, password: text }))}
              placeholder="******"
              secureTextEntry
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <NeonButton
              label={authMode === "login" ? "Login" : "Create Account"}
              onPress={handleAuth}
              disabled={isDataLoading}
            />
            {dataMode === "local" ? (
              <NeonButton
                label="Instant Demo Login"
                variant="secondary"
                onPress={handleDemoLogin}
                disabled={isDataLoading}
              />
            ) : null}
            {isDataLoading ? (
              <View style={styles.authLoadingRow}>
                <ActivityIndicator size="small" color="#49d4ff" />
                <Text style={styles.authLoadingText}>Connecting...</Text>
              </View>
            ) : null}

            <Pressable
              onPress={() => setAuthMode((prev) => (prev === "login" ? "register" : "login"))}
            >
              <Text style={styles.switchModeText}>
                {authMode === "login"
                  ? "Need an account? Register"
                  : "Already registered? Login"}
              </Text>
            </Pressable>
            {dataMode === "local" ? (
              <Text style={styles.demoCreds}>
                Demo: {demoCredentials.email} / {demoCredentials.password}
              </Text>
            ) : null}
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <CyberBackground />

      <View style={styles.mainWrap}>
        <Animated.View
          style={[
            styles.topPanel,
            {
              transform: [
                { translateY: floatY },
                { perspective: 900 },
                { rotateX: "4deg" },
              ],
            },
          ]}
        >
          <View>
            <Text style={styles.headerTitle}>Neural Attendance Grid</Text>
            <Text style={styles.headerSubtitle}>
              {currentUser.name} | {currentUser.email} | {dataMode.toUpperCase()}
            </Text>
          </View>
          <NeonButton label="Logout" variant="secondary" onPress={handleLogout} />
        </Animated.View>

        <View style={styles.tabBar}>
          {screens.map((screen) => (
            <TabButton
              key={screen.id}
              label={screen.label}
              isActive={screen.id === activeScreen}
              onPress={() => setActiveScreen(screen.id)}
            />
          ))}
        </View>

        {dataMode === "server" ? (
          <View style={styles.modeBannerServer}>
            <Text style={styles.modeBannerTextServer}>
              SERVER MODE ACTIVE | Original backend workflow enabled.
            </Text>
          </View>
        ) : null}

        {mockMode ? (
          <View style={styles.modeBanner}>
            <Text style={styles.modeBannerText}>
              MOCK MODE ACTIVE | Set AI key + real records in Settings to disable.
            </Text>
          </View>
        ) : null}

        {isDataLoading ? (
          <View style={styles.syncRow}>
            <ActivityIndicator size="small" color="#5ed3ff" />
            <Text style={styles.syncText}>Syncing data...</Text>
          </View>
        ) : null}

        {error ? <Text style={styles.errorTextMain}>{error}</Text> : null}
        {notice ? <Text style={styles.noticeText}>{notice}</Text> : null}

        <Animated.View
          style={[
            styles.screenContainer,
            {
              opacity: screenAppear,
              transform: [{ translateY: screenTranslate }],
            },
          ]}
        >
          {activeScreen === "dashboard" ? (
            <DashboardScreen overview={overview} subjectStats={subjectStats} />
          ) : null}
          {activeScreen === "attendance" ? (
            <AttendanceScreen
              subjectForm={subjectForm}
              setSubjectForm={setSubjectForm}
              attendanceForm={attendanceForm}
              setAttendanceForm={setAttendanceForm}
              subjectStats={subjectStats}
              selectedSubjectId={selectedSubjectId}
              setSelectedSubjectId={setSelectedSubjectId}
              sortedRecords={sortedRecords}
              onCreateSubject={handleCreateSubject}
              onSaveAttendance={handleSaveAttendance}
              onDeleteAttendance={handleDeleteAttendance}
            />
          ) : null}
          {activeScreen === "settings" ? (
            <SettingsScreen
              dataMode={dataMode}
              onSwitchMode={handleSwitchMode}
              aiKey={aiKeyInput}
              setAiKey={setAiKeyInput}
              onSaveAiKey={handleSaveAiKey}
              onResetMock={handleResetMock}
              mockMode={mockMode}
              localUsersCount={db?.users.length || 0}
              serverUrl={API_BASE_URL}
            />
          ) : null}
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#05070f" },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: {
    color: "#8ccfff",
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  authWrap: { flex: 1, justifyContent: "center", padding: 16 },
  authPanel: {
    backgroundColor: "rgba(7, 16, 38, 0.86)",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(74, 154, 255, 0.36)",
    padding: 18,
    gap: 9,
    shadowColor: "#21b5ff",
    shadowOpacity: 0.36,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
  },
  brandTitle: {
    color: "#d7eeff",
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  brandSubtitle: {
    color: "rgba(147, 189, 255, 0.85)",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 2,
  },
  mockHint: {
    color: "rgba(118, 191, 255, 0.85)",
    fontSize: 11,
    lineHeight: 17,
    marginBottom: 6,
  },
  modeToggleWrap: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "rgba(91, 138, 230, 0.46)",
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 4,
  },
  modeToggleButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    backgroundColor: "rgba(8, 19, 45, 0.86)",
  },
  modeToggleButtonActive: {
    backgroundColor: "rgba(34, 93, 255, 0.3)",
    borderBottomWidth: 2,
    borderBottomColor: "#63d2ff",
  },
  modeToggleText: {
    color: "rgba(153, 188, 244, 0.8)",
    fontSize: 12,
    fontWeight: "700",
  },
  modeToggleTextActive: {
    color: "#dff3ff",
  },
  switchModeText: {
    textAlign: "center",
    color: "#72c5ff",
    marginTop: 2,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  authLoadingRow: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  authLoadingText: {
    color: "#94d9ff",
    fontSize: 12,
    fontWeight: "700",
  },
  demoCreds: { textAlign: "center", color: "rgba(170, 198, 255, 0.6)", fontSize: 11 },
  inputBlock: { gap: 5 },
  inputLabel: {
    color: "#9ec7ff",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(102, 153, 255, 0.42)",
    backgroundColor: "rgba(4, 11, 30, 0.8)",
    color: "#e4f4ff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  button: {
    borderRadius: 11,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  buttonPrimary: {
    borderColor: "rgba(62, 182, 255, 0.9)",
    backgroundColor: "rgba(22, 100, 255, 0.35)",
  },
  buttonSecondary: {
    borderColor: "rgba(122, 151, 223, 0.5)",
    backgroundColor: "rgba(20, 36, 81, 0.72)",
  },
  buttonPressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  buttonDisabled: { opacity: 0.5 },
  buttonText: {
    color: "#e9f6ff",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  buttonTextSecondary: { color: "#badbff" },
  mainWrap: { flex: 1, paddingHorizontal: 12, paddingBottom: 8 },
  topPanel: {
    marginTop: 6,
    marginBottom: 10,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(73, 140, 255, 0.35)",
    backgroundColor: "rgba(8, 18, 43, 0.76)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: { color: "#e3f2ff", fontSize: 17, fontWeight: "800", letterSpacing: 0.4 },
  headerSubtitle: { color: "rgba(161, 198, 255, 0.86)", fontSize: 12, marginTop: 2 },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "rgba(8, 16, 38, 0.66)",
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "rgba(83, 135, 251, 0.32)",
    padding: 3,
    gap: 4,
  },
  tabButton: { flex: 1, paddingVertical: 9, alignItems: "center", borderRadius: 10 },
  tabButtonActive: {
    backgroundColor: "rgba(29, 90, 255, 0.28)",
    borderWidth: 1,
    borderColor: "rgba(78, 190, 255, 0.58)",
  },
  tabText: { color: "rgba(157, 187, 240, 0.82)", fontSize: 12, fontWeight: "700" },
  tabTextActive: { color: "#d6f0ff" },
  modeBanner: {
    marginTop: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(247, 167, 91, 0.62)",
    backgroundColor: "rgba(88, 45, 10, 0.37)",
  },
  modeBannerText: {
    color: "#ffc387",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
    textAlign: "center",
  },
  modeBannerServer: {
    marginTop: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(99, 214, 255, 0.55)",
    backgroundColor: "rgba(12, 60, 92, 0.45)",
  },
  modeBannerTextServer: {
    color: "#bdefff",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
    textAlign: "center",
  },
  syncRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
  },
  syncText: {
    color: "#9adfff",
    fontSize: 12,
    fontWeight: "700",
  },
  errorText: { color: "#ff8690", fontSize: 12, fontWeight: "700", marginVertical: 2 },
  errorTextMain: { color: "#ff8690", fontSize: 12, fontWeight: "700", marginTop: 8 },
  noticeText: { color: "#82e7c0", fontSize: 12, marginTop: 8, fontWeight: "700" },
  screenContainer: { flex: 1, marginTop: 8 },
  screenScroll: { paddingBottom: 18, gap: 10 },
  panel: {
    backgroundColor: "rgba(8, 16, 38, 0.8)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(68, 126, 255, 0.3)",
    padding: 12,
    gap: 9,
    transform: [{ perspective: 900 }, { rotateX: "2.7deg" }],
  },
  heroPanel: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  heroTextWrap: { flex: 1, paddingRight: 8, gap: 5 },
  heroTitle: { color: "#d7ecff", fontSize: 18, fontWeight: "800" },
  heroSubtitle: { color: "rgba(173, 205, 255, 0.82)", fontSize: 12 },
  heroStatsRow: { flexDirection: "row", gap: 24, marginTop: 6 },
  heroMetricValue: { color: "#53d7ff", fontWeight: "800", fontSize: 21 },
  heroMetricLabel: { color: "rgba(164, 194, 238, 0.86)", fontSize: 11, fontWeight: "700" },
  panelTitle: { color: "#d8efff", fontSize: 14, fontWeight: "800", letterSpacing: 0.4 },
  emptyText: { color: "rgba(157, 186, 236, 0.75)", fontSize: 12 },
  subjectCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(69, 119, 226, 0.35)",
    backgroundColor: "rgba(4, 10, 27, 0.74)",
    overflow: "hidden",
    flexDirection: "row",
  },
  subjectGlowStrip: {
    width: 5,
    shadowOpacity: 0.95,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 0 },
  },
  subjectBody: { flex: 1, paddingHorizontal: 10, paddingVertical: 9, gap: 4 },
  subjectHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 6,
  },
  subjectTitle: { color: "#d9eeff", fontSize: 14, fontWeight: "700", flex: 1 },
  subjectMeta: { color: "rgba(170, 198, 243, 0.86)", fontSize: 11.5, lineHeight: 16 },
  riskBadge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  riskText: { fontSize: 10, fontWeight: "800" },
  calcWrap: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  calcStats: { flex: 1, gap: 6 },
  calcLine: { color: "#bbe2ff", fontSize: 12, fontWeight: "700" },
  subjectChipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  subjectChip: {
    borderWidth: 1,
    borderColor: "rgba(87, 132, 223, 0.4)",
    backgroundColor: "rgba(7, 17, 42, 0.8)",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  subjectChipSelected: { backgroundColor: "rgba(20, 45, 92, 0.86)" },
  subjectChipText: { color: "rgba(173, 199, 245, 0.88)", fontSize: 11.5, fontWeight: "700" },
  statusSwitch: { flexDirection: "row", gap: 8 },
  statusButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(90, 133, 223, 0.45)",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "rgba(7, 17, 42, 0.8)",
  },
  statusButtonPresent: {
    borderColor: "rgba(78, 226, 165, 0.8)",
    backgroundColor: "rgba(23, 86, 58, 0.45)",
  },
  statusButtonAbsent: {
    borderColor: "rgba(255, 106, 126, 0.85)",
    backgroundColor: "rgba(119, 30, 42, 0.46)",
  },
  statusButtonText: { color: "rgba(168, 195, 236, 0.85)", fontSize: 12, fontWeight: "700" },
  statusButtonTextActive: { color: "#e9f6ff" },
  recordRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(65, 90, 146, 0.32)",
    paddingVertical: 8,
  },
  recordDot: { width: 10, height: 10, borderRadius: 5 },
  recordInfo: { flex: 1, gap: 2 },
  recordTitle: { color: "#ddf2ff", fontSize: 12, fontWeight: "700" },
  recordMeta: { color: "rgba(160, 189, 232, 0.84)", fontSize: 11 },
  deleteChip: {
    borderWidth: 1,
    borderColor: "rgba(255, 124, 140, 0.7)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "rgba(120, 32, 44, 0.52)",
  },
  deleteChipText: { color: "#ffb6be", fontSize: 10.5, fontWeight: "800" },
  settingsText: { color: "rgba(173, 201, 246, 0.86)", fontSize: 12, lineHeight: 18 },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(80, 108, 166, 0.38)",
    paddingBottom: 8,
  },
  infoLabel: { color: "rgba(165, 194, 238, 0.88)", fontWeight: "700", fontSize: 12 },
  infoValue: { color: "#d4ecff", fontWeight: "800", fontSize: 12 },
  infoValueSmall: {
    color: "#d4ecff",
    fontWeight: "700",
    fontSize: 10,
    maxWidth: "62%",
    textAlign: "right",
  },
});
