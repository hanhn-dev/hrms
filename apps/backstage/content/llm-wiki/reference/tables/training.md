---
source-root: HRMS-DATABASE/HRMS-TRAINING/TABLES
generated-by: mechanical extraction (CREATE TABLE parse for columns/FKs) + LLM-inferred one-line descriptions from table name/columns
confidence: low-medium (descriptions are inferred, not sourced from comments — verify against source before relying on business meaning)
last-analyzed: 2026-07-08
---

# HRMS-TRAINING — Table Catalog

Database: `Training`. Training management: trainings, assignments, TNI (training-needs identification), quizzes, assessments, evaluations, feedback.

78 tables (see `../../architecture/module-catalog.md`). Descriptions are inferred from table/column
names by an LLM pass, not from source comments (this codebase's CREATE TABLE scripts carry none) —
treat as a navigation aid, not authoritative business definition. "Depends on" lists FK targets found
via `FOREIGN KEY ... REFERENCES` in this table's own script and in ALTER scripts elsewhere in the module tree;
it omits self-referential FKs. A handful of tables use non-standard file formats the parser could not read
columns from — these are marked "(unparsed)".

| Table | Description | Depends on |
|---|---|---|
| `EmpGoal` | Employee training goal record tracking planned training dates and trained hours per employee. | — |
| `EMPNumberMapping` | Maps employment numbers to employee IDs and names with an active status flag. | — |
| `TAdhoc_Training_Request` | Ad-hoc training requests with schedule, category, budget, trainer, and approval details. | — |
| `TAdhoc_Training_Request_DP` | Duplicate/staging (_DP) variant of TAdhoc_Training_Request with an added NewBusUnitId column. | — |
| `TAssessment` | Assessment definitions linking questions and test type to a training with start/end dates. | `TTraining` |
| `TAssessmentEmp` | Employee responses/attempts to training assessments, recording chosen option and attempt number. | `TAssessment` |
| `TAssignment` | Employee training assignments tracking mandatory status, pre/post assessment scores, approval, and completion. | `TTraining` |
| `TAssignment_DP` | Duplicate/staging (_DP) variant of TAssignment with an added NewBusUnitId column. | — |
| `TAssignment_Status` | Status history log for assessments, recording status codes and comments per assessment. | `TAssessment` |
| `TAttendance` | Training session attendance records per employee, session, and training. | `TTraining`, `TTrainingSession` |
| `TCLAIM` | Security claim/permission definitions with text descriptions tied to a module. | — |
| `TCLAIM_ASSIGNMENT` | Assigns claims (permissions) to employees or roles within an employer. | `TCLAIM` |
| `TConfiguration` | Employer-level training configuration: technical/non-technical hour targets and TNI survey frequencies. | — |
| `TDocumentsInfo` | Uploaded document metadata linked to training-related request transactions. | — |
| `TEMAIL_NOTIFICATION` | Log of email notifications sent for training requests, including status and delivery attempts. | — |
| `TempEmpActive` | Temporary table listing active employees by ID and name. | — |
| `TEmployeeTrainingEvaluation` | Post-training evaluation records per employee, including evaluator rating and retraining recommendation. | — |
| `TEmployeeTrainingEvaluationQuestion` | Question-level responses within an employee's training evaluation. | — |
| `TEvaluation` | Named evaluation definitions configured per employer. | — |
| `TEvaluationConfiguration` | Evaluation timing configuration specifying effective date and duration per employer. | — |
| `TEvaluator` | List of evaluators who can assess employee training performance, per employer. | — |
| `TExternalTrainings` | External (outside-organization) training records with category, dates, scores, and verification status. | — |
| `TExternalTrainings_DP` | Duplicate/staging (_DP) variant of TExternalTrainings with an added NewBusUnitIds column. | — |
| `TFeedback` | Feedback questions defined per training, optionally targeted at trainers. | `TTraining` |
| `TFeedback_Emp` | Employee-submitted answers to training feedback questions. | `TFeedback` |
| `TFeedback_Emp_Action` | Tracks admin review actions and notes on employee training feedback. | `TTraining` |
| `TLOOKUP` | Generic hierarchical lookup/reference values used across the training module, scoped by employer. | — |
| `tlookup_TRN` | Translation or staging variant of TLOOKUP holding lookup text values. | — |
| `TMiscellaneousTrainings` | Ad-hoc/miscellaneous trainings not tied to standard training records, with source, dates, and hours. | — |
| `TOnlineTrainingCompletion` | Tracks employee completion progress and duration for online training documents. | `TTraining`, `TTrainingDocuments` |
| `TPMSTniRatings` | Ratings given to employees for PMS-linked TNI training details, including rater and verifier. | — |
| `TQuestion` | Question bank for training assessments/quizzes/feedback with category, complexity, and type metadata. | — |
| `TQuestion_32` | Backup or snapshot variant of TQuestion (subset of columns, no ID sort key). | — |
| `TQuestionOption` | Answer options for questions, including sequence, selection, and weightage. | — |
| `TQuiz` | Quiz definitions per training, including duration, passing score, and threshold. | — |
| `TQuizEmp` | Employee-submitted answers/attempts for training quizzes. | — |
| `TQuizResult` | Employee quiz results per training and quiz number, including score and completion status. | — |
| `Training Calendar 2019` | Training calendar table for year 2019 (no column metadata available). | — |
| `TRatingScales` | Defines rating scale ranges (min/max) and level descriptions for a rating scale type. | — |
| `TRatingScaleTypes` | Named rating scale types with number of levels, configured per employer. | — |
| `TRequestWorkflows_08012024` | Dated snapshot/backup of training request approval workflow records, including manager and reassignment info. | — |
| `TReviewLevel` | Named review levels used in training evaluation workflows, per employer. | — |
| `TTNI_EmployeeGoalSetup` | Employee training-needs-identification (TNI) goal period setup with start/end dates and business unit. | — |
| `TTNI_EmployeeGoalSetup_DP` | Duplicate/staging (_DP) variant of TTNI_EmployeeGoalSetup with an added NewBusUnitId column. | — |
| `TTNI_EmployeeTrainings` | Employee-proposed or assigned trainings tied to a TNI cycle, topic, and quarter. | — |
| `TTNI_SETUP` | TNI cycle setup per employer/year/quarter, defining submission windows and included employees/business units. | — |
| `TTNI_TrainingHourInfo` | Training hour requirements by type and skill level linked to an employee TNI goal. | `TTNI_EmployeeGoalSetup` |
| `TTrainers` | Trainers assigned to trainings, including internal/external flag, contact, ratings, and backup trainer. | `TTraining` |
| `TTrainers_History` | Audit history of changes to TTrainers records, capturing the action performed and who made it. | — |
| `TTraining` | Core training course definitions: category, type, skill level, schedule, assessment settings, and publish status. | — |
| `TTraining_DP` | Duplicate/staging (_DP) variant of TTraining with identical columns. | — |
| `TTraining_History` | Audit history of changes to TTraining records, preserving prior course configurations. | — |
| `TTraining_Mapping` | Maps trainings to business units. | — |
| `TTraining_Ratings` | Ratings given to a training by employees or trainers. | `TTraining` |
| `TTrainingAssignment` | Assignment/homework tasks tied to a training, with submission deadline and description. | — |
| `TTrainingAssignmentDocument` | Documents attached to a training assignment task. | — |
| `TTrainingAssignmentEmp` | Employee submissions for a training assignment, including trainer feedback. | — |
| `TTrainingAssignmentEmpDocument` | Documents uploaded by employees for their training assignment submission. | — |
| `TTrainingAssignmentEmpDocument_one` | Duplicate/backup variant of TTrainingAssignmentEmpDocument with identical columns. | — |
| `TTrainingAssignmentEmpDocument_two` | Duplicate/backup variant of TTrainingAssignmentEmpDocument with identical columns. | — |
| `TTrainingAssignmentEmpRatings` | Stores employee ratings and comments given for a specific training assignment. | — |
| `TTrainingConfiguration` | Employer-level configuration for training hours targets and TNI survey frequency by role. | — |
| `TTrainingDiscussion` | Discussion threads on training topics scoped to employees and business units within a date range. | — |
| `TTrainingDiscussionComment` | Comments posted by users under a training discussion thread. | — |
| `TTrainingDiscussionDocument` | Documents uploaded and attached to a training discussion thread. | — |
| `TTrainingDocumentPreview` | Tracks how long an employee previewed a training document. | — |
| `TTrainingDocuments` | Documents attached to a training, including sequencing and thumbnail selection. | `TTraining` |
| `TTrainingEvaluation` | Evaluation setup for a training, including rating scale, review level, evaluators, and due date. | — |
| `TTrainingNotifications` | Notifications for employees/managers about training cooling and evaluation due dates. | — |
| `TTrainingProductMapping` | Maps trainings to products they relate to. | — |
| `TTrainingSession` | Scheduled sessions of a training, including date, time, duration, and conference/meeting details. | `TTraining` |
| `TTrainingSession_History` | History/audit log of changes made to TTrainingSession records. | — |
| `TTrainingSurvey` | Periodic (yearly/quarterly) training surveys defined per employer, with publish and open-till status. | — |
| `TTrainingSurvey_Emp` | Employee-submitted answers/option selections for a training survey question. | `TTrainingSurveyQuestions` |
| `TTrainingSurvey_Ratings` | Employee ratings submitted for a training survey. | `TTrainingSurvey` |
| `TTrainingSurveyQuestions` | Questions included in a given training survey. | `TTrainingSurvey` |
| `TVideoStreamUserQueue` | Queue of employees waiting to access a video stream for an employer. | — |
| `TWaiver` | Waiver requests by employees for a training/session, with category and comments. | `TTraining`, `TTrainingSession` |
