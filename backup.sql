-- MySQL dump 10.13  Distrib 8.0.43, for Linux (aarch64)
--
-- Host: localhost    Database: thesis_management
-- ------------------------------------------------------
-- Server version	8.0.43

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `announcements`
--

DROP TABLE IF EXISTS `announcements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `announcements` (
  `id` int NOT NULL AUTO_INCREMENT,
  `presentation_id` int NOT NULL,
  `published_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `presentation_id` (`presentation_id`),
  CONSTRAINT `announcements_ibfk_1` FOREIGN KEY (`presentation_id`) REFERENCES `presentations` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `announcements`
--

LOCK TABLES `announcements` WRITE;
/*!40000 ALTER TABLE `announcements` DISABLE KEYS */;
INSERT INTO `announcements` VALUES (1,1,'2025-08-31 17:09:43',NULL),(2,2,'2025-08-31 18:06:53',NULL);
/*!40000 ALTER TABLE `announcements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `attachments`
--

DROP TABLE IF EXISTS `attachments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `attachments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `thesis_id` int NOT NULL,
  `uploaded_by` int NOT NULL,
  `filename` varchar(500) DEFAULT NULL,
  `file_url` varchar(1000) DEFAULT NULL,
  `mime` varchar(100) DEFAULT NULL,
  `is_draft` tinyint(1) DEFAULT '1',
  `uploaded_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `thesis_id` (`thesis_id`),
  KEY `uploaded_by` (`uploaded_by`),
  CONSTRAINT `attachments_ibfk_1` FOREIGN KEY (`thesis_id`) REFERENCES `theses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `attachments_ibfk_2` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `attachments`
--

LOCK TABLES `attachments` WRITE;
/*!40000 ALTER TABLE `attachments` DISABLE KEYS */;
INSERT INTO `attachments` VALUES (1,1,1,'test_thesis.txt','/uploads/1756659808780_test_thesis.txt','text/plain',0,'2025-08-31 17:03:28'),(2,1,1,'ÎÎÎÎ.pdf','/uploads/1756665241826_________.pdf','application/pdf',1,'2025-08-31 18:34:01'),(3,1,1,'ÎÎ¹ÏÎ¸ÏÏÎ·ÌÏÎ¹Î¿ Î±ÏÎ¿Î¼Î¹ÎºÎ·ÌÏ.pdf','/uploads/1756665358001_Î_Î¹Ï_Î_Ï_Ï_Î_Ì_Ï_Î¹Î__Î_Ï_Î_Î¼Î¹ÎºÎ_Ì_Ï_.pdf','application/pdf',1,'2025-08-31 18:35:58'),(4,1,1,'Screenshot 2026-01-13 at 12.50.08â¯AM.png','/uploads/1769357297823_Screenshot_2026-01-13_at_12_50_08â__AM.png','image/png',1,'2026-01-25 16:08:17');
/*!40000 ALTER TABLE `attachments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `committee_members`
--

DROP TABLE IF EXISTS `committee_members`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `committee_members` (
  `id` int NOT NULL AUTO_INCREMENT,
  `thesis_id` int NOT NULL,
  `instructor_id` int NOT NULL,
  `role` enum('supervisor','member') DEFAULT 'member',
  `invited_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `accepted_at` timestamp NULL DEFAULT NULL,
  `rejected_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `thesis_id` (`thesis_id`),
  KEY `instructor_id` (`instructor_id`),
  CONSTRAINT `committee_members_ibfk_1` FOREIGN KEY (`thesis_id`) REFERENCES `theses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `committee_members_ibfk_2` FOREIGN KEY (`instructor_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `committee_members`
--

LOCK TABLES `committee_members` WRITE;
/*!40000 ALTER TABLE `committee_members` DISABLE KEYS */;
INSERT INTO `committee_members` VALUES (1,5,11,'supervisor','2025-08-31 16:58:16','2025-08-31 16:58:16',NULL),(2,1,12,'member','2025-08-31 17:01:20','2025-08-31 17:01:20',NULL);
/*!40000 ALTER TABLE `committee_members` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `grades`
--

DROP TABLE IF EXISTS `grades`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `grades` (
  `id` int NOT NULL AUTO_INCREMENT,
  `thesis_id` int NOT NULL,
  `grader_id` int NOT NULL,
  `grade_numeric` decimal(4,2) DEFAULT NULL,
  `comments` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `thesis_id` (`thesis_id`),
  KEY `grader_id` (`grader_id`),
  CONSTRAINT `grades_ibfk_1` FOREIGN KEY (`thesis_id`) REFERENCES `theses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `grades_ibfk_2` FOREIGN KEY (`grader_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `grades`
--

LOCK TABLES `grades` WRITE;
/*!40000 ALTER TABLE `grades` DISABLE KEYS */;
INSERT INTO `grades` VALUES (1,1,12,9.00,'Upon further reflection, this is truly exceptional work that merits the highest grade. The innovation in the audio processing pipeline exceeds expectations.','2025-08-31 17:13:14');
/*!40000 ALTER TABLE `grades` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `invitations`
--

DROP TABLE IF EXISTS `invitations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `invitations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `thesis_id` int NOT NULL,
  `instructor_id` int NOT NULL,
  `status` enum('PENDING','ACCEPTED','REJECTED') DEFAULT 'PENDING',
  `invited_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `responded_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `thesis_id` (`thesis_id`),
  KEY `instructor_id` (`instructor_id`),
  CONSTRAINT `invitations_ibfk_1` FOREIGN KEY (`thesis_id`) REFERENCES `theses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `invitations_ibfk_2` FOREIGN KEY (`instructor_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invitations`
--

LOCK TABLES `invitations` WRITE;
/*!40000 ALTER TABLE `invitations` DISABLE KEYS */;
INSERT INTO `invitations` VALUES (1,1,12,'ACCEPTED','2025-08-31 17:00:57','2025-08-31 17:01:20');
/*!40000 ALTER TABLE `invitations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notes`
--

DROP TABLE IF EXISTS `notes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `thesis_id` int NOT NULL,
  `author_id` int NOT NULL,
  `content` varchar(300) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `thesis_id` (`thesis_id`),
  KEY `author_id` (`author_id`),
  CONSTRAINT `notes_ibfk_1` FOREIGN KEY (`thesis_id`) REFERENCES `theses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `notes_ibfk_2` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notes`
--

LOCK TABLES `notes` WRITE;
/*!40000 ALTER TABLE `notes` DISABLE KEYS */;
/*!40000 ALTER TABLE `notes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `presentations`
--

DROP TABLE IF EXISTS `presentations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `presentations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `thesis_id` int NOT NULL,
  `scheduled_at` datetime DEFAULT NULL,
  `mode` enum('IN_PERSON','ONLINE') DEFAULT NULL,
  `room` varchar(200) DEFAULT NULL,
  `online_link` varchar(500) DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `thesis_id` (`thesis_id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `presentations_ibfk_1` FOREIGN KEY (`thesis_id`) REFERENCES `theses` (`id`),
  CONSTRAINT `presentations_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `presentations`
--

LOCK TABLES `presentations` WRITE;
/*!40000 ALTER TABLE `presentations` DISABLE KEYS */;
INSERT INTO `presentations` VALUES (1,5,'2025-12-15 15:00:00','ONLINE',NULL,'https://zoom.us/j/1234567890',11,'2025-08-31 17:09:43'),(2,1,'2026-03-12 14:33:00','IN_PERSON','room 101',NULL,1,'2025-08-31 18:06:53');
/*!40000 ALTER TABLE `presentations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `theses`
--

DROP TABLE IF EXISTS `theses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `theses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `topic_id` int DEFAULT NULL,
  `student_id` int NOT NULL,
  `supervisor_id` int NOT NULL,
  `state` enum('UNDER_ASSIGNMENT','ACTIVE','UNDER_REVIEW','COMPLETED','CANCELLED') DEFAULT 'UNDER_ASSIGNMENT',
  `assigned_at` timestamp NULL DEFAULT NULL,
  `started_at` timestamp NULL DEFAULT NULL,
  `finalized_at` timestamp NULL DEFAULT NULL,
  `cancellation_reason` text,
  `ap_number` varchar(64) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `topic_id` (`topic_id`),
  KEY `student_id` (`student_id`),
  KEY `supervisor_id` (`supervisor_id`),
  CONSTRAINT `theses_ibfk_1` FOREIGN KEY (`topic_id`) REFERENCES `topics` (`id`),
  CONSTRAINT `theses_ibfk_2` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`),
  CONSTRAINT `theses_ibfk_3` FOREIGN KEY (`supervisor_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `theses`
--

LOCK TABLES `theses` WRITE;
/*!40000 ALTER TABLE `theses` DISABLE KEYS */;
INSERT INTO `theses` VALUES (1,1,1,11,'ACTIVE','2025-02-01 10:00:00','2025-02-15 09:00:00',NULL,NULL,NULL,'2025-08-31 16:55:19'),(2,2,2,12,'UNDER_ASSIGNMENT','2025-06-01 12:00:00',NULL,NULL,NULL,NULL,'2025-08-31 16:55:19'),(3,3,3,13,'UNDER_REVIEW','2024-09-15 08:00:00','2024-09-20 09:00:00',NULL,NULL,NULL,'2025-08-31 16:55:19'),(4,4,4,14,'COMPLETED','2023-10-01 09:00:00','2023-10-05 09:00:00','2024-06-20 10:00:00',NULL,NULL,'2025-08-31 16:55:19'),(5,6,5,11,'ACTIVE','2025-08-31 16:58:16','2025-08-31 16:58:23',NULL,NULL,NULL,'2025-08-31 16:58:16');
/*!40000 ALTER TABLE `theses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `topics`
--

DROP TABLE IF EXISTS `topics`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `topics` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(300) NOT NULL,
  `summary` text,
  `description_pdf` varchar(500) DEFAULT NULL,
  `creator_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `creator_id` (`creator_id`),
  CONSTRAINT `topics_ibfk_1` FOREIGN KEY (`creator_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `topics`
--

LOCK TABLES `topics` WRITE;
/*!40000 ALTER TABLE `topics` DISABLE KEYS */;
INSERT INTO `topics` VALUES (1,'Audio moment tagging','CV+Audio pipeline for tagging moments',NULL,11,'2025-08-31 16:55:06'),(2,'Music recommendation with embeddings','Hybrid recs for short-form audio',NULL,12,'2025-08-31 16:55:06'),(3,'Efficient DB indexing','Indexing strategies for real-time queries',NULL,13,'2025-08-31 16:55:06'),(4,'Web performance caching','Cache-control strategy analysis',NULL,14,'2025-08-31 16:55:06'),(5,'Privacy-preserving analytics','Differential privacy for logs',NULL,15,'2025-08-31 16:55:06'),(6,'Real-time collaborative editing','CRDTs vs OT comparisons',NULL,11,'2025-08-31 16:55:06'),(7,'Automated unit test generation','AI-assisted unit tests',NULL,12,'2025-08-31 16:55:06'),(8,'Anomaly detection on logs','Stream-based anomaly detection',NULL,13,'2025-08-31 16:55:06');
/*!40000 ALTER TABLE `topics` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `role` enum('student','instructor','secretary') NOT NULL,
  `am` varchar(32) DEFAULT NULL,
  `full_name` varchar(200) NOT NULL,
  `email` varchar(200) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `address` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_role` (`role`),
  KEY `idx_am` (`am`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'student','2024001','Agis Ioannou','agis@example.com','$2a$10$Oyi2RP2MPkiiYhbX8JS0je1umqjt4NXZNJNupgJYiQfW4H51BMOxu','6942507306','test12','2025-08-31 16:54:50'),(2,'student','2024002','Maria Kosta','maria@example.com','$2a$10$Oyi2RP2MPkiiYhbX8JS0je1umqjt4NXZNJNupgJYiQfW4H51BMOxu',NULL,NULL,'2025-08-31 16:54:50'),(3,'student','2024003','Nikos Pappas','nikos@example.com','$2a$10$Oyi2RP2MPkiiYhbX8JS0je1umqjt4NXZNJNupgJYiQfW4H51BMOxu',NULL,NULL,'2025-08-31 16:54:50'),(4,'student','2024004','Eleni Georgiou','eleni@example.com','$2a$10$Oyi2RP2MPkiiYhbX8JS0je1umqjt4NXZNJNupgJYiQfW4H51BMOxu',NULL,NULL,'2025-08-31 16:54:50'),(5,'student','2024005','Spiros Vasilis','spiros@example.com','$2a$10$Oyi2RP2MPkiiYhbX8JS0je1umqjt4NXZNJNupgJYiQfW4H51BMOxu',NULL,NULL,'2025-08-31 16:54:50'),(6,'student','2024006','Katerina Alexiou','kate@example.com','$2a$10$Oyi2RP2MPkiiYhbX8JS0je1umqjt4NXZNJNupgJYiQfW4H51BMOxu',NULL,NULL,'2025-08-31 16:54:50'),(7,'student','2024007','Dimitris Marin','dimitris@example.com','$2a$10$Oyi2RP2MPkiiYhbX8JS0je1umqjt4NXZNJNupgJYiQfW4H51BMOxu',NULL,NULL,'2025-08-31 16:54:50'),(8,'student','2024008','Anna Theodorou','anna@example.com','$2a$10$Oyi2RP2MPkiiYhbX8JS0je1umqjt4NXZNJNupgJYiQfW4H51BMOxu',NULL,NULL,'2025-08-31 16:54:50'),(9,'student','2024009','Panagiotis L.','panos@example.com','$2a$10$Oyi2RP2MPkiiYhbX8JS0je1umqjt4NXZNJNupgJYiQfW4H51BMOxu',NULL,NULL,'2025-08-31 16:54:50'),(10,'student','2024010','Theo F.','theo@example.com','$2a$10$Oyi2RP2MPkiiYhbX8JS0je1umqjt4NXZNJNupgJYiQfW4H51BMOxu',NULL,NULL,'2025-08-31 16:54:50'),(11,'instructor',NULL,'Prof. Ioannis K.','ioannis.k@uni.edu','$2a$10$29S4mUuqIkhCieiyadKineEFgfZbJwkI64hXn2pzYMqErJH.34a0m',NULL,NULL,'2025-08-31 16:55:06'),(12,'instructor',NULL,'Dr. Sofia N.','sofia.n@uni.edu','$2a$10$29S4mUuqIkhCieiyadKineEFgfZbJwkI64hXn2pzYMqErJH.34a0m',NULL,NULL,'2025-08-31 16:55:06'),(13,'instructor',NULL,'Dr. Petros Z.','petros.z@uni.edu','$2a$10$29S4mUuqIkhCieiyadKineEFgfZbJwkI64hXn2pzYMqErJH.34a0m',NULL,NULL,'2025-08-31 16:55:06'),(14,'instructor',NULL,'Dr. Elena M.','elena.m@uni.edu','$2a$10$29S4mUuqIkhCieiyadKineEFgfZbJwkI64hXn2pzYMqErJH.34a0m',NULL,NULL,'2025-08-31 16:55:06'),(15,'instructor',NULL,'Prof. Andreas P.','andreas.p@uni.edu','$2a$10$29S4mUuqIkhCieiyadKineEFgfZbJwkI64hXn2pzYMqErJH.34a0m',NULL,NULL,'2025-08-31 16:55:06'),(16,'secretary',NULL,'Secretary Office','secretary@uni.edu','$2a$10$29S4mUuqIkhCieiyadKineEFgfZbJwkI64hXn2pzYMqErJH.34a0m',NULL,NULL,'2025-08-31 16:55:06');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-02-01 11:07:11
