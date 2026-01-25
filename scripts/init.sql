-- Database initialization script

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role ENUM('student','instructor','secretary') NOT NULL,
  am VARCHAR(32), -- student id number (nullable for instructors/secretary)
  full_name VARCHAR(200) NOT NULL,
  email VARCHAR(200) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_role (role),
  INDEX idx_am (am)
);

-- Topics (created by instructors)
CREATE TABLE IF NOT EXISTS topics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(300) NOT NULL,
  summary TEXT,
  description_pdf VARCHAR(500), -- path or URL
  creator_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Theses (one thesis per student-topic assignment)
CREATE TABLE IF NOT EXISTS theses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  topic_id INT,
  student_id INT NOT NULL,
  supervisor_id INT NOT NULL,
  state ENUM('UNDER_ASSIGNMENT','ACTIVE','UNDER_REVIEW','COMPLETED','CANCELLED') DEFAULT 'UNDER_ASSIGNMENT',
  assigned_at TIMESTAMP NULL,
  started_at TIMESTAMP NULL,
  finalized_at TIMESTAMP NULL,
  cancellation_reason TEXT,
  ap_number VARCHAR(64), -- number from the General Assembly (if any)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (topic_id) REFERENCES topics(id),
  FOREIGN KEY (student_id) REFERENCES users(id),
  FOREIGN KEY (supervisor_id) REFERENCES users(id)
);

-- Committee members (for each thesis)
CREATE TABLE IF NOT EXISTS committee_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  thesis_id INT NOT NULL,
  instructor_id INT NOT NULL,
  role ENUM('supervisor','member') DEFAULT 'member',
  invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  accepted_at TIMESTAMP NULL,
  rejected_at TIMESTAMP NULL,
  FOREIGN KEY (thesis_id) REFERENCES theses(id) ON DELETE CASCADE,
  FOREIGN KEY (instructor_id) REFERENCES users(id)
);

-- Invitations (for transparency / timestamps)
CREATE TABLE IF NOT EXISTS invitations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  thesis_id INT NOT NULL,
  instructor_id INT NOT NULL,
  status ENUM('PENDING','ACCEPTED','REJECTED') DEFAULT 'PENDING',
  invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMP NULL,
  FOREIGN KEY (thesis_id) REFERENCES theses(id) ON DELETE CASCADE,
  FOREIGN KEY (instructor_id) REFERENCES users(id)
);

-- File attachments
CREATE TABLE IF NOT EXISTS attachments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  thesis_id INT NOT NULL,
  uploaded_by INT NOT NULL,
  filename VARCHAR(500),
  file_url VARCHAR(1000),
  mime VARCHAR(100),
  is_draft BOOLEAN DEFAULT TRUE,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (thesis_id) REFERENCES theses(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- Notes (private to author)
CREATE TABLE IF NOT EXISTS notes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  thesis_id INT NOT NULL,
  author_id INT NOT NULL,
  content VARCHAR(300),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (thesis_id) REFERENCES theses(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id)
);

-- Presentation scheduling
CREATE TABLE IF NOT EXISTS presentations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  thesis_id INT NOT NULL,
  scheduled_at DATETIME,
  mode ENUM('IN_PERSON','ONLINE'),
  room VARCHAR(200),
  online_link VARCHAR(500),
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (thesis_id) REFERENCES theses(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Grades per committee member
CREATE TABLE IF NOT EXISTS grades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  thesis_id INT NOT NULL,
  grader_id INT NOT NULL, -- instructor who graded
  grade_numeric DECIMAL(4,2),
  comments TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (thesis_id) REFERENCES theses(id) ON DELETE CASCADE,
  FOREIGN KEY (grader_id) REFERENCES users(id)
);

-- Announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  presentation_id INT NOT NULL,
  published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,
  FOREIGN KEY (presentation_id) REFERENCES presentations(id)
);
