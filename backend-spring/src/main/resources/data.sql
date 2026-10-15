-- CircuLink RGUKT Platform - MySQL 8 Enterprise Seed Data
-- Default Password for seeded test users: 'Password@123'
-- BCrypt Hash (strength 10): $2a$10$7EqJtq98hPqEX7fNZaFWoO.8/bB821WvM0d4xT7WqOqUf1fPqE3uW

USE circulink;

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Insert Initial Users
INSERT INTO users (id, college_id, email, password, name, role, branch, campus, year, section, points, level, mfa_enabled, is_active, joined_community) VALUES
(1, 'DIRECTOR01', 'director@rguktrkv.ac.in', '$2a$10$7EqJtq98hPqEX7fNZaFWoO.8/bB821WvM0d4xT7WqOqUf1fPqE3uW', 'Prof. K. Venkata Ramana', 'DIRECTOR', 'GENERAL', 'RK Valley', NULL, NULL, 500, 'Advanced', FALSE, TRUE, TRUE),
(2, 'ADMIN01', 'admin@rguktrkv.ac.in', '$2a$10$7EqJtq98hPqEX7fNZaFWoO.8/bB821WvM0d4xT7WqOqUf1fPqE3uW', 'RGUKT System Administrator', 'ADMIN', 'GENERAL', 'RK Valley', NULL, NULL, 1000, 'Expert', FALSE, TRUE, TRUE),
(3, 'DEAN01', 'dean.academics@rguktrkv.ac.in', '$2a$10$7EqJtq98hPqEX7fNZaFWoO.8/bB821WvM0d4xT7WqOqUf1fPqE3uW', 'Dr. S. Chandra Sekhar', 'DEAN', 'CSE', 'RK Valley', NULL, NULL, 600, 'Advanced', FALSE, TRUE, TRUE),
(4, 'DSW01', 'dsw@rguktrkv.ac.in', '$2a$10$7EqJtq98hPqEX7fNZaFWoO.8/bB821WvM0d4xT7WqOqUf1fPqE3uW', 'Dr. M. Anjaneyulu', 'DSW', 'ECE', 'RK Valley', NULL, NULL, 400, 'Intermediate', FALSE, TRUE, TRUE),
(5, 'HODCSE01', 'hod.cse@rguktrkv.ac.in', '$2a$10$7EqJtq98hPqEX7fNZaFWoO.8/bB821WvM0d4xT7WqOqUf1fPqE3uW', 'Dr. P. Sreenivasulu', 'HOD', 'CSE', 'RK Valley', NULL, NULL, 450, 'Intermediate', FALSE, TRUE, TRUE),
(6, 'FAC01', 'faculty.cse@rguktrkv.ac.in', '$2a$10$7EqJtq98hPqEX7fNZaFWoO.8/bB821WvM0d4xT7WqOqUf1fPqE3uW', 'Mr. Ramesh Babu', 'FACULTY', 'CSE', 'RK Valley', NULL, NULL, 250, 'Intermediate', FALSE, TRUE, TRUE),
(7, 'SEC01', 'security@rguktrkv.ac.in', '$2a$10$7EqJtq98hPqEX7fNZaFWoO.8/bB821WvM0d4xT7WqOqUf1fPqE3uW', 'Chief Security Officer', 'SECURITY', 'GENERAL', 'RK Valley', NULL, NULL, 100, 'Beginner', FALSE, TRUE, TRUE),
(8, 'R220379', 'r220379@rguktrkv.ac.in', '$2a$10$7EqJtq98hPqEX7fNZaFWoO.8/bB821WvM0d4xT7WqOqUf1fPqE3uW', 'Sohel Shaik', 'STUDENT', 'CSE', 'RK Valley', 'E3', 'CSE-02', 850, 'Advanced', FALSE, TRUE, TRUE),
(9, 'N210100', 'n210100@rguktnuz.ac.in', '$2a$10$7EqJtq98hPqEX7fNZaFWoO.8/bB821WvM0d4xT7WqOqUf1fPqE3uW', 'Priya Sharma', 'STUDENT', 'ECE', 'Nuzvid', 'E4', 'ECE-01', 520, 'Advanced', FALSE, TRUE, TRUE),
(10, 'S230450', 's230450@rguktskl.ac.in', '$2a$10$7EqJtq98hPqEX7fNZaFWoO.8/bB821WvM0d4xT7WqOqUf1fPqE3uW', 'Karthik Varma', 'STUDENT', 'MECH', 'Srikakulam', 'E2', 'MECH-01', 180, 'Beginner', FALSE, TRUE, TRUE),
(11, 'O240010', 'o240010@rguktong.ac.in', '$2a$10$7EqJtq98hPqEX7fNZaFWoO.8/bB821WvM0d4xT7WqOqUf1fPqE3uW', 'Ananya Reddy', 'STUDENT', 'CIVIL', 'Ongole', 'E1', 'CIVIL-01', 90, 'Beginner', FALSE, TRUE, TRUE);

-- 2. Insert User Badges
INSERT INTO user_badges (user_id, badge_name) VALUES
(8, 'First Post'),
(8, 'Innovator'),
(8, 'Faculty Approved'),
(8, 'Top Contributor'),
(9, 'First Post'),
(9, 'Social Hero');

-- 3. Insert Circulars
INSERT INTO circulars (id, circular_number, author_id, author_role, title, content, category, priority, status, publish_date, is_active) VALUES
(1, 'RGUKT/2026/0001', 1, 'DIRECTOR', 'Commencement of Academic Year 2026-27 & Registration Guidelines', 'All students and faculty across RK Valley, Nuzvid, Srikakulam, and Ongole campuses are hereby informed that the academic year 2026-27 will commence on July 1st, 2026. Online registration portals are open.', 'ACADEMIC', 'HIGH', 'PUBLISHED', NOW(), TRUE),
(2, 'RGUKT/2026/0002', 3, 'DEAN', 'End Semester Examination Schedule - Monsoon Semester', 'The final examination timetable for Engineering batches E1 through E4 has been officially released. Hall tickets will be downloadable via CircuLink.', 'EXAM', 'URGENT', 'PUBLISHED', NOW(), TRUE),
(3, 'RGUKT/2026/0003', 5, 'HOD', 'Department Seminar on Advanced Generative AI & Robotics Lab Access', 'The Department of Computer Science & Engineering is organizing a 3-day hands-on workshop on Large Language Models and Edge Robotics. Awaiting Dean approval.', 'EVENT', 'MEDIUM', 'PENDING_DEAN', NULL, TRUE);

-- 4. Circular Targets
INSERT INTO circular_targets (circular_id, target_type, target_value) VALUES
(1, 'CAMPUS', 'ALL'),
(1, 'BRANCH', 'ALL'),
(2, 'CAMPUS', 'ALL'),
(2, 'BRANCH', 'ALL'),
(3, 'CAMPUS', 'RK Valley'),
(3, 'BRANCH', 'CSE');

-- 5. Circular Approvals
INSERT INTO circular_approvals (circular_id, step_order, role, status, approved_by_id, comment, action_at) VALUES
(1, 0, 'HOD', 'APPROVED', 1, 'Auto-approved by Director', NOW()),
(1, 1, 'DEAN', 'APPROVED', 1, 'Auto-approved by Director', NOW()),
(1, 2, 'DIRECTOR', 'APPROVED', 1, 'Published by Director', NOW()),
(2, 0, 'HOD', 'APPROVED', 3, 'Approved at Dean Level', NOW()),
(2, 1, 'DEAN', 'APPROVED', 3, 'Approved by Dean Academics', NOW()),
(2, 2, 'DIRECTOR', 'APPROVED', 1, 'Final Approval by Director', NOW()),
(3, 0, 'HOD', 'APPROVED', 5, 'Forwarded for Dean review', NOW()),
(3, 1, 'DEAN', 'PENDING', NULL, '', NULL),
(3, 2, 'DIRECTOR', 'PENDING', NULL, '', NULL);

-- 6. Insert Posts (Innovation Feed)
INSERT INTO posts (id, author_id, title, content, type, branch, campus, visibility, likes_count, endorsements_count, status, is_featured) VALUES
(1, 8, 'Autonomous Campus Navigation Rover using ROS2 and LiDAR', 'Designed and tested a low-cost autonomous delivery rover specifically calibrated for RGUKT RK Valley hilly terrain. Successfully tested delivering internal courier packets between Academic Block 1 and Central Library.', 'INNOVATION', 'CSE', 'RK Valley', 'PUBLIC', 42, 3, 'PUBLISHED', TRUE),
(2, 9, 'Low-Power IoT Water Quality Monitoring System for Rural Hostels', 'Implemented continuous pH, turbidity, and TDS sensor telemetry using ESP32 communicating via LoRaWAN to campus monitoring dashboards.', 'PROJECT', 'ECE', 'Nuzvid', 'PUBLIC', 28, 1, 'PUBLISHED', FALSE);

-- 7. Post Topics & Tags
INSERT INTO post_topics (post_id, topic) VALUES
(1, 'Robotics'),
(1, 'AI'),
(2, 'IoT'),
(2, 'Social Service');

-- 8. Post Endorsements
INSERT INTO post_endorsements (post_id, faculty_id, message, weight) VALUES
(1, 6, 'Outstanding engineering implementation. Ready for state-level prototype grant submission.', 2),
(1, 5, 'Highly commendable interdisciplinary innovation. Recommended for incubation.', 3);

-- 9. Comments
INSERT INTO comments (id, post_id, author_id, content) VALUES
(1, 1, 9, 'Great work Sohel! What is the battery endurance during continuous uphill navigation?'),
(2, 1, 8, 'Thanks Priya! Tested with a 4S LiFePO4 battery pack giving approx 3.5 hours active run-time.');

-- 10. Notifications
INSERT INTO notifications (recipient_id, sender_id, type, title, message, is_read, priority) VALUES
(8, 6, 'POST_ENDORSED', 'Your post was endorsed!', 'Mr. Ramesh Babu (FACULTY) endorsed your post "Autonomous Campus Navigation Rover"', FALSE, 'MEDIUM'),
(8, 1, 'NEW_CIRCULAR', 'New Circular: Commencement of Academic Year', 'Official circular published by Director', TRUE, 'HIGH');

SET FOREIGN_KEY_CHECKS = 1;
