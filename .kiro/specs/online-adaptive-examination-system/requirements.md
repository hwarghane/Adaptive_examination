# Requirements Document

## Introduction

The Online Adaptive Examination System is a comprehensive upgrade to the existing MERN-based adaptive quiz application. It introduces class-based organization (similar to Google Classroom), role-separated authentication with detailed user profiles, a Bloom's Taxonomy-categorized question bank, an adaptive examination engine, rich analytics dashboards, and a notification system. The system must support multiple colleges, thousands of students, and multiple concurrent teachers without requiring teachers to manually create student accounts.

---

## Glossary

- **System**: The Online Adaptive Examination System (full MERN stack application)
- **Auth_Service**: The component responsible for authentication, JWT issuance, and session management
- **Student**: A registered user with role `student` who can join classes and take exams
- **Teacher**: A registered user with role `teacher` who can manage classes, questions, and exams
- **Student_Profile**: Extended profile data for a Student (college, branch, year, semester, roll number)
- **Teacher_Profile**: Extended profile data for a Teacher (college, department)
- **Class**: A virtual classroom created by a Teacher, identified by a unique 8-character class code
- **Class_Code**: An auto-generated, unique, 8-character alphanumeric string that identifies a Class
- **QR_Code**: A scannable image encoding the Class invite link, generated for each Class
- **Invite_Link**: A unique URL that allows a Student to join a Class
- **Question_Bank**: The repository of all MCQ questions, each tagged with a Bloom's level and difficulty factor
- **Bloom_Level**: One of six cognitive levels: Remember, Understand, Apply, Analyze, Evaluate, Create
- **Difficulty_Factor**: A numeric value (1–10) representing the relative difficulty of a question
- **Exam**: A timed assessment created by a Teacher and assigned to one or more Classes
- **Adaptive_Engine**: The component that selects the next question based on the Student's answer history and question difficulty
- **Attempt**: A single Student's session for a given Exam, tracking answers, score, time, and Bloom progression
- **Notification**: A message delivered to a Student about an assigned exam, deadline, or schedule update
- **Analytics_Service**: The component that computes and serves performance statistics for Teachers and Students

---

## Requirements

### Requirement 1: Student Self-Registration

**User Story:** As a prospective student, I want to create my own account with my academic details, so that I can independently access the system without needing a teacher to create my account.

#### Acceptance Criteria

1. WHEN a new user submits a student registration form with name, email, password, college, branch, year, semester, and roll number, THE Auth_Service SHALL create a new Student account and associated Student_Profile.
2. WHEN a student registration request is received with an email that already exists in the system, THE Auth_Service SHALL return an error indicating the email is already registered.
3. WHEN a student registration request is received with a password shorter than 8 characters, THE Auth_Service SHALL return a validation error specifying the minimum password length requirement.
4. THE Auth_Service SHALL hash all passwords using bcrypt with a minimum cost factor of 10 before storing them in the database.
5. WHEN a student registration form is missing any required field (name, email, password, college, branch, year, semester, or roll number), THE Auth_Service SHALL return a descriptive validation error identifying each missing field.

---

### Requirement 2: Teacher Self-Registration

**User Story:** As a prospective teacher, I want to create my own account with my institutional details, so that I can independently access the system and manage classes.

#### Acceptance Criteria

1. WHEN a new user submits a teacher registration form with name, email, password, college, and department, THE Auth_Service SHALL create a new Teacher account and associated Teacher_Profile.
2. WHEN a teacher registration request is received with an email that already exists in the system, THE Auth_Service SHALL return an error indicating the email is already registered.
3. WHEN a teacher registration request is received with a password shorter than 8 characters, THE Auth_Service SHALL return a validation error specifying the minimum password length requirement.
4. WHEN a teacher registration form is missing any required field (name, email, password, college, or department), THE Auth_Service SHALL return a descriptive validation error identifying each missing field.

---

### Requirement 3: Role-Based Authentication and Session Management

**User Story:** As a registered user (student or teacher), I want to log in with my email and password, so that I can access the features appropriate to my role.

#### Acceptance Criteria

1. WHEN a user submits valid login credentials (email and password), THE Auth_Service SHALL return a signed JWT containing the user's ID and role, valid for 7 days.
2. WHEN a user submits login credentials with an unrecognised email, THE Auth_Service SHALL return a 401 error without revealing whether the email or password is incorrect.
3. WHEN a user submits login credentials with an incorrect password, THE Auth_Service SHALL return a 401 error without revealing whether the email or password is incorrect.
4. WHILE a valid JWT is present in the request Authorization header AND the requested route matches the JWT's role claim, THE System SHALL proactively grant access to the protected resource.
5. IF a request to a protected route is made without a valid JWT, THEN THE Auth_Service SHALL return a 401 Unauthorized response.
6. IF a Student attempts to access a Teacher-only route, THEN THE Auth_Service SHALL return a 403 Forbidden response.
7. IF a Teacher attempts to access a Student-only route, THEN THE Auth_Service SHALL return a 403 Forbidden response.

---

### Requirement 4: Class Creation and Code Generation

**User Story:** As a teacher, I want to create unlimited virtual classes and share a unique code or QR code with students, so that students can join the correct class independently.

#### Acceptance Criteria

1. WHEN a Teacher submits a class creation request with a class name, THE System SHALL create a new Class record and generate a unique Class_Code.
2. THE System SHALL generate Class_Codes that are exactly 8 alphanumeric characters and unique across all Classes.
3. WHEN a Class is created, THE System SHALL generate a QR_Code image encoding the Class Invite_Link for that Class.
4. WHEN a Class is created, THE System SHALL generate an Invite_Link in the format `/join/{Class_Code}` for that Class.
5. THE System SHALL allow a single Teacher to create an unlimited number of Classes.
6. WHEN a Teacher requests the list of their Classes, THE System SHALL return only the Classes created by that Teacher.

---

### Requirement 5: Student Class Enrollment

**User Story:** As a student, I want to join a class by entering a class code or scanning a QR code, so that I can access the exams assigned to that class.

#### Acceptance Criteria

1. WHEN a Student submits a valid Class_Code, THE System SHALL enroll the Student in the corresponding Class.
2. WHEN a Student submits a Class_Code that does not match any existing Class, THE System SHALL return an error indicating the code is invalid.
3. WHEN a Student who is already enrolled in a Class submits that Class's code again, THE System SHALL return an error indicating the Student is already a member of that Class.
4. THE System SHALL allow a Student to be enrolled in multiple Classes simultaneously.
5. THE System SHALL allow a Class to contain Students from different colleges and branches.
6. WHEN a Student scans a valid QR_Code or follows a valid Invite_Link, THE System SHALL redirect the Student to the class join confirmation page pre-populated with the Class_Code.

---

### Requirement 6: Question Bank Management

**User Story:** As a teacher, I want to add MCQ questions categorised by Bloom's Taxonomy level and difficulty, so that the adaptive engine has a diverse and well-tagged question pool to draw from.

#### Acceptance Criteria

1. WHEN a Teacher submits a new question with text, four answer options, a correct option index, a Bloom_Level, and a Difficulty_Factor, THE System SHALL store the question in the Question_Bank associated with that Teacher.
2. THE System SHALL accept Bloom_Level values of exactly: Remember, Understand, Apply, Analyze, Evaluate, or Create.
3. THE System SHALL accept Difficulty_Factor values that are integers in the range 1 to 10 inclusive.
4. WHERE an image is attached to a question submission, THE System SHALL store the image and associate it with the question record.
5. WHERE an explanation is provided for a question, THE System SHALL store the explanation text and return it alongside the question when displaying results.
6. WHEN a Teacher requests their questions filtered by Bloom_Level, THE System SHALL return only questions matching the specified level created by that Teacher.
7. WHEN a Teacher submits a question with fewer than two answer options or with a non-positive option count, THE System SHALL return a validation error.
8. WHEN a Teacher updates an existing question, THE System SHALL persist the updated fields without creating a duplicate record.
9. WHEN a Teacher deletes a question, THE System SHALL remove the question from the Question_Bank and disassociate it from any future Exam selections; historical Attempt answer records SHALL be preserved regardless of whether the question was valid at the time of deletion.

---

### Requirement 7: Exam Creation and Class Assignment

**User Story:** As a teacher, I want to create exams and assign them to one or more of my classes, so that all enrolled students in those classes are notified and can take the exam.

#### Acceptance Criteria

1. WHEN a Teacher creates an Exam with a title, duration (in minutes), start time, end time, and at least one assigned Class, THE System SHALL store the Exam and link it to the specified Classes.
2. THE System SHALL allow a Teacher to assign a single Exam to multiple Classes simultaneously.
3. WHEN an Exam is assigned to a Class, THE System SHALL create a Notification for every Student enrolled in that Class containing the exam title, start time, and end time.
4. WHEN a Teacher requests the list of their Exams, THE System SHALL return all Exams created by that Teacher along with the list of assigned Classes.
5. IF a Teacher attempts to create an Exam with an end time that is earlier than or equal to the start time, THEN THE System SHALL return a validation error.
6. WHEN a Teacher updates an Exam's assigned Classes after creation, THE System SHALL send Notifications to Students newly added to the Exam and cancel pending Notifications for Students removed from the Exam; the System MAY also send or cancel Notifications in response to other administrative triggers beyond class assignment changes.

---

### Requirement 8: Adaptive Examination Engine

**User Story:** As a student, I want the exam to adaptively select questions based on how well I am performing, so that the difficulty matches my current knowledge level and gives a fair, personalised assessment.

#### Acceptance Criteria

1. WHEN a Student starts an Exam, THE Adaptive_Engine SHALL initialise an Attempt record with a starting Bloom_Level of Remember and a starting Difficulty_Factor of 5.
2. WHEN a Student answers a question correctly, THE Adaptive_Engine SHALL select the next question with a Difficulty_Factor equal to the current Difficulty_Factor plus 1, capped at 10.
3. WHEN a Student answers a question incorrectly, THE Adaptive_Engine SHALL select the next question with a Difficulty_Factor equal to the current Difficulty_Factor minus 1, floored at 1.
4. WHEN the Adaptive_Engine advances the Difficulty_Factor above the threshold for the current Bloom_Level AND the Student's correct-answer rate for the current Bloom_Level meets or exceeds 70%, THE Adaptive_Engine SHALL advance the Bloom_Level to the next level in the sequence: Remember → Understand → Apply → Analyze → Evaluate → Create.
5. WHEN the Adaptive_Engine needs to decrease the Bloom_Level below the current level, THE Adaptive_Engine SHALL decrease the Bloom_Level to the previous level in the sequence, with a floor of Remember.
6. THE Adaptive_Engine SHALL record the question ID, selected option, correctness, Bloom_Level at time of answer, Difficulty_Factor at time of answer, and time taken (in seconds) for every answer in the Attempt.
7. WHEN no question matching the required Bloom_Level and Difficulty_Factor is available in the Question_Bank, THE Adaptive_Engine SHALL select the nearest available question by minimising the absolute difference in Difficulty_Factor within the current Bloom_Level.
8. WHEN an Exam's time limit expires during an active Attempt, THE System SHALL automatically submit the Attempt with all answers provided up to that point.
9. THE System SHALL prevent a Student from starting an Attempt for an Exam outside the Exam's defined start time and end time window.
10. THE System SHALL prevent a Student from submitting more than one completed Attempt per Exam.

---

### Requirement 9: Attempt Results and Scoring

**User Story:** As a student, I want to see my detailed results after completing an exam, so that I can understand my performance and learn from my mistakes.

#### Acceptance Criteria

1. WHEN an Attempt is submitted, THE System SHALL compute and store the total score as the count of correct answers divided by the total questions answered, expressed as a percentage rounded to two decimal places.
2. WHEN an Attempt is submitted, THE System SHALL store the total time taken in seconds for the entire Attempt; IF the Attempt contains no answered questions, THEN THE System SHALL store a total time of zero seconds.
3. WHEN a Student requests the result of a completed Attempt, THE System SHALL return the score, total time taken, per-question breakdown (question text, selected option, correct option, correctness, explanation if available), and the Bloom_Level progression history.
4. THE System SHALL store the final Bloom_Level reached in the Attempt for use in analytics and future adaptive initialisation.

---

### Requirement 10: Teacher Analytics Dashboard

**User Story:** As a teacher, I want to view detailed performance analytics for my classes, so that I can identify knowledge gaps and tailor my teaching accordingly.

#### Acceptance Criteria

1. WHEN a Teacher requests class-level analytics for a specific Class that has no completed Attempts, THE Analytics_Service SHALL return a response indicating that no data is available for that Class. WHEN a Teacher requests class-level analytics for a Class that has at least one completed Attempt, THE Analytics_Service SHALL return the average score, score distribution, average time taken, and number of Attempts for that Class.
2. WHEN a Teacher requests Bloom's level analytics for a Class, THE Analytics_Service SHALL return the distribution of final Bloom_Levels achieved across all Attempts in that Class.
3. WHEN a Teacher requests difficulty statistics for a Class, THE Analytics_Service SHALL return the average Difficulty_Factor reached and the distribution of Difficulty_Factors across all Attempts in that Class.
4. WHEN a Teacher requests an individual Student report for a Student enrolled in their Class, THE Analytics_Service SHALL return the Student's Attempt history, scores, Bloom_Level progressions, and time taken for all Exams in that Class.
5. WHEN a Teacher requests analytics for an Exam assigned to multiple Classes, THE Analytics_Service SHALL return per-Class breakdowns as well as an aggregate summary.

---

### Requirement 11: Student Analytics Dashboard

**User Story:** As a student, I want to view my own exam history and adaptive progress, so that I can understand my strengths, weaknesses, and areas for improvement.

#### Acceptance Criteria

1. WHEN a Student requests their exam history, THE Analytics_Service SHALL return a list of all completed Attempts including exam title, date, score, total time, and final Bloom_Level reached.
2. WHEN a Student requests their adaptive progress, THE Analytics_Service SHALL return the Bloom_Level progression chart across all Attempts ordered by date.
3. WHEN a Student requests their strengths and weaknesses report, THE Analytics_Service SHALL return the Bloom_Levels and question topics where the Student's correct-answer rate exceeds 70% (strengths) and falls below 50% (weaknesses).
4. WHEN a Student requests recommendations, THE Analytics_Service SHALL return a list of up to 5 Bloom_Levels and Difficulty_Factor ranges where the Student has the most room for improvement, based on historical Attempt data.

---

### Requirement 12: Notification System

**User Story:** As a student, I want to receive notifications about new exams, deadlines, and schedule changes, so that I never miss an assigned exam.

#### Acceptance Criteria

1. WHEN an Exam is assigned to a Class, THE System SHALL create an in-app Notification for each enrolled Student containing the exam title, assigned class name, start time, and end time.
2. WHEN a Student requests their notifications, THE System SHALL return all unread Notifications for that Student ordered by creation time descending.
3. WHEN a Student marks a Notification as read, THE System SHALL update the Notification's read status and exclude it from the unread count.
4. THE System SHALL display a count of unread Notifications in the Student's navigation interface.
5. WHEN an Exam's start time or end time is updated by the Teacher, THE System SHALL create a new Notification for all Students enrolled in the affected Classes indicating the schedule change.

---

### Requirement 13: Data Model and Database Integrity

**User Story:** As a system administrator, I want the data model to be well-normalised and consistent, so that the system scales reliably to thousands of students across multiple institutions.

#### Acceptance Criteria

1. THE System SHALL maintain separate collections (or documents) for: users, student_profiles, teacher_profiles, classes, class_students, exams, exam_classes, questions, options, student_attempts, attempt_answers, results, and notifications.
2. THE System SHALL enforce referential consistency such that deleting a Class does not delete the enrolled Students' user accounts, and deleting a Question preserves historical Attempt answer records.
3. THE System SHALL store all timestamps in UTC ISO 8601 format.
4. THE System SHALL index the class_students collection on (class_id, student_id) to support enrollment lookups at scale.
5. THE System SHALL index the student_attempts collection on (exam_id, student_id) to support attempt uniqueness enforcement and fast retrieval.

---

### Requirement 14: Round-Trip Data Serialization

**User Story:** As a developer, I want all data serialized to and from the API to be consistent and lossless, so that no information is corrupted during transmission or storage.

#### Acceptance Criteria

1. THE System SHALL serialize all API responses as valid JSON conforming to the documented response schemas.
2. FOR ALL Attempt records, serializing an Attempt to JSON and deserializing it SHALL produce an equivalent Attempt object with no loss of score, answer history, timing data, or Bloom progression.
3. WHEN an image associated with a question is retrieved, THE System SHALL return the image in the same format and resolution in which it was uploaded.

