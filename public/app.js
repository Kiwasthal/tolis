// Thesis Management System - Frontend Application
class ThesisApp {
  constructor() {
    this.token = localStorage.getItem("token");
    this.user = null;
    this.apiBase = window.location.origin + "/api";

    this.init();
  }

  init() {
    // Check if user is already logged in
    if (this.token) {
      this.validateToken();
    } else {
      this.showLogin();
    }

    this.setupEventListeners();
  }

  setupEventListeners() {
    // Login form
    const loginForm = document.getElementById("login-form");
    if (loginForm) {
      loginForm.addEventListener("submit", (e) => this.handleLogin(e));
    }

    // Demo account buttons
    document.querySelectorAll(".demo-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => this.handleDemoLogin(e));
    });

    // Navigation
    document.querySelectorAll(".nav-link").forEach((link) => {
      link.addEventListener("click", (e) => this.handleNavigation(e));
    });

    // Logout button
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => this.handleLogout());
    }

    // Thesis filter
    const thesisFilter = document.getElementById("thesis-filter");
    if (thesisFilter) {
      thesisFilter.addEventListener("change", () => this.loadTheses());
    }
  }

  // Authentication methods
  async handleLogin(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const credentials = {
      email: formData.get("email"),
      password: formData.get("password"),
    };

    try {
      this.showLoading(true);
      const response = await this.apiCall("/auth/login", "POST", credentials);

      if (response.token) {
        this.token = response.token;
        localStorage.setItem("token", this.token);
        await this.loadUserProfile();
        this.showDashboard();
        this.showToast("Welcome back!", "success");
      } else {
        throw new Error("No token received");
      }
    } catch (error) {
      this.showToast(error.message || "Login failed", "error");
    } finally {
      this.showLoading(false);
    }
  }

  handleDemoLogin(e) {
    const email = e.currentTarget.dataset.email;
    const password = e.currentTarget.dataset.password;

    document.getElementById("email").value = email;
    document.getElementById("password").value = password;

    // Auto-submit the form
    document.getElementById("login-form").dispatchEvent(new Event("submit"));
  }

  async validateToken() {
    try {
      await this.loadUserProfile();
      this.showDashboard();
      this.loadDashboardData();
    } catch (error) {
      console.error("Token validation failed:", error);
      this.handleLogout();
    }
  }

  async loadUserProfile() {
    const response = await this.apiCall("/auth/profile");
    this.user = response.user;
    this.updateUserInterface();
  }

  updateUserInterface() {
    if (!this.user) return;

    // Update user info in navbar
    document.getElementById("user-name").textContent = this.user.full_name;
    document.getElementById("user-role").textContent = this.user.role;

    // Add role class to body for CSS styling
    document.body.className = `role-${this.user.role}`;

    // Show/hide role-specific elements
    this.updateRoleVisibility();
  }

  updateRoleVisibility() {
    const role = this.user.role;

    // Hide all role-specific elements first
    document
      .querySelectorAll(".student-only, .instructor-only, .secretary-only")
      .forEach((el) => {
        el.style.display = "none";
      });

    // Show elements for current role
    document.querySelectorAll(`.${role}-only`).forEach((el) => {
      el.style.display = "flex";
    });

    // Special handling for nav links
    document.querySelectorAll(".nav-link.secretary-only").forEach((link) => {
      link.style.display = role === "secretary" ? "flex" : "none";
    });
  }

  handleLogout() {
    this.token = null;
    this.user = null;
    localStorage.removeItem("token");
    document.body.className = "";
    this.showLogin();
    this.showToast("Logged out successfully", "info");
  }

  // Navigation methods
  handleNavigation(e) {
    e.preventDefault();
    const page = e.currentTarget.dataset.page;
    if (page) {
      this.showPage(page);
    }
  }

  showPage(pageName) {
    // Update active nav link
    document.querySelectorAll(".nav-link").forEach((link) => {
      link.classList.remove("active");
    });
    document
      .querySelector(`[data-page="${pageName}"]`)
      ?.classList.add("active");

    // Show corresponding content section
    document.querySelectorAll(".content-section").forEach((section) => {
      section.classList.remove("active");
    });
    document.getElementById(`${pageName}-content`)?.classList.add("active");

    // Load page-specific data
    this.loadPageData(pageName);
  }

  async loadPageData(pageName) {
    switch (pageName) {
      case "overview":
        await this.loadDashboardData();
        break;
      case "topics":
        await this.loadTopics();
        break;
      case "theses":
        await this.loadTheses();
        break;
      case "admin":
        if (this.user.role === "secretary") {
          await this.loadSystemHealth();
        }
        break;
    }
  }

  // Dashboard data loading
  async loadDashboardData() {
    try {
      // Load stats
      await Promise.all([
        this.loadDashboardStats(),
        this.loadRecentActivity(),
        this.loadProfileSummary(),
      ]);
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    }
  }

  async loadDashboardStats() {
    try {
      const [topicsResponse, thesesResponse] = await Promise.all([
        this.apiCall("/topics"),
        this.apiCall("/theses"),
      ]);

      // Update stat cards
      document.getElementById("total-topics").textContent =
        topicsResponse.topics?.length || 0;

      let myThesesCount = 0;
      let committeeCount = 0;
      let gradeAverage = "-";

      if (thesesResponse.theses) {
        if (this.user.role === "student") {
          myThesesCount = thesesResponse.theses.filter(
            (t) => t.student_id === this.user.id
          ).length;
        } else if (this.user.role === "instructor") {
          myThesesCount = thesesResponse.theses.filter(
            (t) => t.supervisor_id === this.user.id
          ).length;
        } else {
          myThesesCount = thesesResponse.theses.length;
        }
      }

      document.getElementById("my-theses").textContent = myThesesCount;
      document.getElementById("committee-count").textContent = committeeCount;
      document.getElementById("grade-average").textContent = gradeAverage;
    } catch (error) {
      console.error("Failed to load dashboard stats:", error);
    }
  }

  async loadRecentActivity() {
    const activityContainer = document.getElementById("recent-activity");
    activityContainer.innerHTML =
      '<div class="loading-placeholder">Loading recent activity...</div>';

    // Simulate some recent activity
    setTimeout(() => {
      activityContainer.innerHTML = `
                <div class="activity-item">
                    <div class="activity-icon"><i class="fas fa-lightbulb"></i></div>
                    <div class="activity-text">
                        <div class="title">New topic "Audio moment tagging" created</div>
                        <div class="time">2 hours ago</div>
                    </div>
                </div>
                <div class="activity-item">
                    <div class="activity-icon"><i class="fas fa-file-alt"></i></div>
                    <div class="activity-text">
                        <div class="title">Thesis assignment completed</div>
                        <div class="time">1 day ago</div>
                    </div>
                </div>
                <div class="activity-item">
                    <div class="activity-icon"><i class="fas fa-star"></i></div>
                    <div class="activity-text">
                        <div class="title">Grade submitted for thesis review</div>
                        <div class="time">3 days ago</div>
                    </div>
                </div>
            `;
    }, 1000);
  }

  async loadProfileSummary() {
    const profileContainer = document.getElementById("profile-summary");

    // Only load for students
    if (!this.user || this.user.role !== "student") {
      return;
    }

    try {
      profileContainer.innerHTML =
        '<div class="loading-placeholder">Loading profile...</div>';

      // Get current user profile
      const response = await this.apiCall("/auth/profile");
      const userData = response.user || this.user;

      profileContainer.innerHTML = `
        <div class="profile-item">
          <i class="fas fa-user"></i>
          <span class="label">Name:</span>
          <span class="value">${this.escapeHtml(userData.full_name)}</span>
        </div>
        <div class="profile-item">
          <i class="fas fa-envelope"></i>
          <span class="label">Email:</span>
          <span class="value">${this.escapeHtml(userData.email)}</span>
        </div>
        <div class="profile-item">
          <i class="fas fa-phone"></i>
          <span class="label">Phone:</span>
          <span class="value ${userData.phone ? "" : "empty"}">${
        userData.phone ? this.escapeHtml(userData.phone) : "Not provided"
      }</span>
        </div>
        <div class="profile-item">
          <i class="fas fa-map-marker-alt"></i>
          <span class="label">Address:</span>
          <span class="value ${userData.address ? "" : "empty"}">${
        userData.address ? this.escapeHtml(userData.address) : "Not provided"
      }</span>
        </div>
        <div class="profile-actions">
          <button class="btn btn-outline btn-sm" onclick="app.editProfile()">
            <i class="fas fa-edit"></i>
            Edit Profile
          </button>
        </div>
      `;
    } catch (error) {
      profileContainer.innerHTML = `
        <div class="error-message">
          <i class="fas fa-exclamation-triangle"></i>
          Failed to load profile data
        </div>
      `;
    }
  }

  // Topics management
  async loadTopics() {
    try {
      const response = await this.apiCall("/topics");
      this.renderTopics(response.topics || []);
    } catch (error) {
      this.showToast("Failed to load topics", "error");
      console.error("Failed to load topics:", error);
    }
  }

  renderTopics(topics) {
    const container = document.getElementById("topics-list");

    if (topics.length === 0) {
      container.innerHTML = `
                <div class="placeholder-content">
                    <i class="fas fa-lightbulb fa-3x"></i>
                    <h3>No topics available</h3>
                    <p>No research topics have been created yet.</p>
                </div>
            `;
      return;
    }

    container.innerHTML = topics
      .map(
        (topic) => `
            <div class="topic-card">
                <div class="topic-header">
                    <h3 class="topic-title">${this.escapeHtml(topic.title)}</h3>
                    <div class="topic-meta">
                        <span class="meta-tag">Created by ${this.escapeHtml(
                          topic.creator_name
                        )}</span>
                    </div>
                </div>
                <div class="topic-summary">
                    ${this.escapeHtml(topic.summary || "No summary available")}
                </div>
                                 <div class="card-actions">
                     ${
                       this.user.role === "student"
                         ? `
                         <div style="padding: 0.5rem; background: var(--surface-hover); border-radius: var(--radius-md); text-align: center; color: var(--text-secondary); font-size: var(--font-size-sm);">
                             <i class="fas fa-info-circle"></i>
                             Topics are assigned by instructors
                         </div>
                     `
                         : ""
                     }
                    ${
                      this.user.role === "instructor" &&
                      topic.creator_id === this.user.id
                        ? `
                        <button class="btn btn-outline" onclick="app.editTopic(${topic.id})">
                            <i class="fas fa-edit"></i>
                            Edit
                        </button>
                    `
                        : ""
                    }
                    <button class="btn btn-outline" onclick="app.viewTopicDetails(${
                      topic.id
                    })">
                        <i class="fas fa-eye"></i>
                        View Details
                    </button>
                </div>
            </div>
        `
      )
      .join("");
  }

  // Theses management
  async loadTheses() {
    try {
      const filterValue = document.getElementById("thesis-filter")?.value || "";
      let url = "/theses";
      if (filterValue) {
        url += `?state=${filterValue}`;
      }

      const response = await this.apiCall(url);
      this.renderTheses(response.theses || []);
    } catch (error) {
      this.showToast("Failed to load theses", "error");
      console.error("Failed to load theses:", error);
    }
  }

  renderTheses(theses) {
    const container = document.getElementById("theses-list");

    if (theses.length === 0) {
      container.innerHTML = `
                <div class="placeholder-content">
                    <i class="fas fa-file-alt fa-3x"></i>
                    <h3>No theses found</h3>
                    <p>No theses match the current filter criteria.</p>
                </div>
            `;
      return;
    }

    container.innerHTML = theses
      .map(
        (thesis) => `
            <div class="thesis-card">
                <div class="thesis-header">
                    <h3 class="thesis-title">${this.escapeHtml(
                      thesis.topic_title
                    )}</h3>
                    <div class="thesis-meta">
                        <span class="meta-tag state-${thesis.state
                          .toLowerCase()
                          .replace("_", "-")}">${thesis.state.replace(
          "_",
          " "
        )}</span>
                        <span class="meta-tag">Student: ${this.escapeHtml(
                          thesis.student_name
                        )}</span>
                    </div>
                </div>
                <div class="thesis-summary">
                    <strong>Supervisor:</strong> ${this.escapeHtml(
                      thesis.supervisor_name
                    )}<br>
                    <strong>Assigned:</strong> ${this.formatDate(
                      thesis.assigned_at
                    )}<br>
                    ${
                      thesis.started_at
                        ? `<strong>Started:</strong> ${this.formatDate(
                            thesis.started_at
                          )}<br>`
                        : ""
                    }
                    ${
                      thesis.finalized_at
                        ? `<strong>Finalized:</strong> ${this.formatDate(
                            thesis.finalized_at
                          )}`
                        : ""
                    }
                </div>
                <div class="card-actions">
                    <button class="btn btn-outline" onclick="app.viewThesisDetails(${
                      thesis.id
                    })">
                        <i class="fas fa-eye"></i>
                        View Details
                    </button>
                    ${
                      this.canManageThesis(thesis)
                        ? `
                        <button class="btn btn-primary" onclick="app.manageThesis(${thesis.id})">
                            <i class="fas fa-cog"></i>
                            Manage
                        </button>
                    `
                        : ""
                    }
                </div>
            </div>
        `
      )
      .join("");
  }

  canManageThesis(thesis) {
    if (this.user.role === "secretary") return true;
    if (
      this.user.role === "instructor" &&
      thesis.supervisor_id === this.user.id
    )
      return true;
    if (this.user.role === "student" && thesis.student_id === this.user.id)
      return true;
    return false;
  }

  // Admin functions
  async loadSystemHealth() {
    try {
      const response = await this.apiCall("/secretary/system/health");
      this.renderSystemHealth(response);
    } catch (error) {
      this.showToast("Failed to load system health", "error");
      console.error("Failed to load system health:", error);
    }
  }

  renderSystemHealth(data) {
    const container = document.getElementById("system-health");

    container.innerHTML = `
            <div class="health-item">
                <span>System Status</span>
                <span style="color: var(--success-color); font-weight: 600;">${data.system_status.toUpperCase()}</span>
            </div>
            <div class="health-item">
                <span>Total Users</span>
                <span>${data.user_statistics.reduce(
                  (sum, stat) => sum + stat.count,
                  0
                )}</span>
            </div>
            <div class="health-item">
                <span>Total Theses</span>
                <span>${data.thesis_statistics.reduce(
                  (sum, stat) => sum + stat.count,
                  0
                )}</span>
            </div>
            <div class="health-item">
                <span>Total Topics</span>
                <span>${data.topic_statistics[0]?.total_topics || 0}</span>
            </div>
        `;
  }

  async exportTheses() {
    try {
      this.showLoading(true);
      const response = await this.apiCall(
        "/secretary/export/theses?format=json"
      );

      // Download the data as JSON file
      const blob = new Blob([JSON.stringify(response, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `theses_export_${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.showToast(
        `Exported ${response.total_theses} theses successfully`,
        "success"
      );
    } catch (error) {
      this.showToast("Failed to export theses", "error");
      console.error("Export failed:", error);
    } finally {
      this.showLoading(false);
    }
  }

  async generateReport() {
    try {
      this.showLoading(true);
      const response = await this.apiCall("/secretary/reports/comprehensive");

      // Show report in modal
      this.showModal("Comprehensive Report", this.formatReport(response));
    } catch (error) {
      this.showToast("Failed to generate report", "error");
      console.error("Report generation failed:", error);
    } finally {
      this.showLoading(false);
    }
  }

  formatReport(data) {
    return `
            <div class="report-content">
                <h4>Overall Statistics</h4>
                <ul>
                    <li>Total Theses: ${
                      data.overall_statistics.total_theses
                    }</li>
                    <li>Under Assignment: ${
                      data.overall_statistics.under_assignment_count
                    }</li>
                    <li>Active: ${data.overall_statistics.active_count}</li>
                    <li>Under Review: ${
                      data.overall_statistics.under_review_count
                    }</li>
                    <li>Completed: ${
                      data.overall_statistics.completed_count
                    }</li>
                    <li>Cancelled: ${
                      data.overall_statistics.cancelled_count
                    }</li>
                </ul>
                
                <h4>Supervisor Statistics</h4>
                <table style="width: 100%; margin-top: 1rem;">
                    <thead>
                        <tr style="border-bottom: 1px solid var(--border-color);">
                            <th style="text-align: left; padding: 0.5rem;">Supervisor</th>
                            <th style="text-align: center; padding: 0.5rem;">Total</th>
                            <th style="text-align: center; padding: 0.5rem;">Completed</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.supervisor_statistics
                          .map(
                            (sup) => `
                            <tr>
                                <td style="padding: 0.5rem;">${sup.supervisor_name}</td>
                                <td style="text-align: center; padding: 0.5rem;">${sup.total_supervised}</td>
                                <td style="text-align: center; padding: 0.5rem;">${sup.completed_supervised}</td>
                            </tr>
                        `
                          )
                          .join("")}
                    </tbody>
                </table>
                
                <h4>Grading Statistics</h4>
                <ul>
                    <li>Graded Theses: ${
                      data.grading_statistics.graded_theses
                    }</li>
                    <li>Total Grades: ${
                      data.grading_statistics.total_grades
                    }</li>
                    <li>Average Grade: ${parseFloat(
                      data.grading_statistics.average_grade || 0
                    ).toFixed(2)}</li>
                    <li>Min Grade: ${
                      data.grading_statistics.min_grade || "N/A"
                    }</li>
                    <li>Max Grade: ${
                      data.grading_statistics.max_grade || "N/A"
                    }</li>
                </ul>
            </div>
        `;
  }

  // Action handlers

  viewTopicDetails(topicId) {
    this.showModal(
      "Topic Details",
      `
            <div class="loading-placeholder">Loading topic details...</div>
        `
    );

    // In a real implementation, load topic details from API
    setTimeout(() => {
      document.getElementById("modal-body").innerHTML = `
                <div>Topic details would be shown here for topic ID: ${topicId}</div>
            `;
    }, 1000);
  }

  async viewThesisDetails(thesisId) {
    this.showModal(
      "Thesis Details",
      `<div class="loading-placeholder">Loading thesis details...</div>`
    );

    try {
      // Load comprehensive thesis data
      const [thesisResponse, committeeResponse, gradesResponse] =
        await Promise.all([
          this.apiCall(`/theses/${thesisId}`),
          this.apiCall(`/invitations/theses/${thesisId}/committee`),
          this.apiCall(`/grades/theses/${thesisId}`),
        ]);

      const thesis = thesisResponse.thesis;
      const committee = committeeResponse.committee || [];
      const grades = gradesResponse.grades || [];

      // Calculate time elapsed since assignment
      const assignedDate = new Date(thesis.assigned_at);
      const now = new Date();
      const daysElapsed = Math.floor(
        (now - assignedDate) / (1000 * 60 * 60 * 24)
      );

      document.getElementById("modal-body").innerHTML = `
        <div class="thesis-details">
          <div class="detail-section">
            <h4><i class="fas fa-lightbulb"></i> Topic Information</h4>
            <div class="detail-grid">
              <div class="detail-item">
                <strong>Title:</strong> ${this.escapeHtml(thesis.topic_title)}
              </div>
              <div class="detail-item">
                <strong>Summary:</strong> ${this.escapeHtml(
                  thesis.topic_summary || "No summary available"
                )}
              </div>
              <div class="detail-item">
                <strong>Supervisor:</strong> ${this.escapeHtml(
                  thesis.supervisor_name
                )}
              </div>
              <div class="detail-item">
                <strong>Status:</strong> 
                <span class="status-badge status-${thesis.state
                  .toLowerCase()
                  .replace("_", "-")}">${thesis.state.replace("_", " ")}</span>
              </div>
              <div class="detail-item">
                <strong>Assigned:</strong> ${this.formatDate(
                  thesis.assigned_at
                )} (${daysElapsed} days ago)
              </div>
              ${
                thesis.started_at
                  ? `
                <div class="detail-item">
                  <strong>Started:</strong> ${this.formatDate(
                    thesis.started_at
                  )}
                </div>
              `
                  : ""
              }
              ${
                thesis.finalized_at
                  ? `
                <div class="detail-item">
                  <strong>Finalized:</strong> ${this.formatDate(
                    thesis.finalized_at
                  )}
                </div>
              `
                  : ""
              }
            </div>
          </div>

          <div class="detail-section">
            <h4><i class="fas fa-users"></i> Committee Members</h4>
            <div class="committee-list">
              ${
                committee.length > 0
                  ? committee
                      .map(
                        (member) => `
                <div class="committee-member">
                  <div class="member-info">
                    <strong>${this.escapeHtml(member.instructor_name)}</strong>
                    <span class="member-role">${member.committee_role}</span>
                  </div>
                  <div class="member-status">
                    ${
                      member.accepted_at
                        ? '<span class="status-accepted"><i class="fas fa-check"></i> Accepted</span>'
                        : member.rejected_at
                        ? '<span class="status-rejected"><i class="fas fa-times"></i> Rejected</span>'
                        : '<span class="status-pending"><i class="fas fa-clock"></i> Pending</span>'
                    }
                  </div>
                </div>
              `
                      )
                      .join("")
                  : '<p class="empty-state">No committee members assigned yet</p>'
              }
            </div>
          </div>

          ${
            grades.length > 0
              ? `
            <div class="detail-section">
              <h4><i class="fas fa-star"></i> Grades</h4>
              <div class="grades-list">
                ${grades
                  .map(
                    (grade) => `
                  <div class="grade-item">
                    <div class="grade-header">
                      <strong>${this.escapeHtml(grade.grader_name)}</strong>
                      <span class="grade-value">${grade.grade_numeric}/10</span>
                    </div>
                    ${
                      grade.comments
                        ? `
                      <div class="grade-comments">${this.escapeHtml(
                        grade.comments
                      )}</div>
                    `
                        : ""
                    }
                  </div>
                `
                  )
                  .join("")}
                <div class="average-grade">
                  <strong>Average Grade: ${
                    gradesResponse.statistics.average_grade?.toFixed(2) || "N/A"
                  }/10</strong>
                </div>
              </div>
            </div>
          `
              : ""
          }

          ${
            this.user.role === "student" && thesis.student_id === this.user.id
              ? `
            <div class="detail-section">
              <h4><i class="fas fa-cog"></i> Actions</h4>
              <div class="thesis-actions">
                ${this.renderStudentActions(thesis, committee)}
              </div>
            </div>
          `
              : ""
          }
        </div>
      `;
    } catch (error) {
      document.getElementById("modal-body").innerHTML = `
        <div class="error-state">
          <i class="fas fa-exclamation-triangle"></i>
          <h3>Failed to load thesis details</h3>
          <p>${error.message}</p>
          <button class="btn btn-outline" onclick="app.closeModal()">Close</button>
        </div>
      `;
    }
  }

  manageThesis(thesisId) {
    this.showModal(
      "Manage Thesis",
      `
            <div class="loading-placeholder">Loading thesis management options...</div>
        `
    );

    // In a real implementation, load management interface
    setTimeout(() => {
      document.getElementById("modal-body").innerHTML = `
                <div>Thesis management interface would be shown here for thesis ID: ${thesisId}</div>
            `;
    }, 1000);
  }

  createNewTopic() {
    this.showModal(
      "Create New Topic",
      `
            <form id="create-topic-form" style="display: flex; flex-direction: column; gap: 1rem;">
                <div class="form-group">
                    <label for="topic-title">Title *</label>
                    <input type="text" id="topic-title" name="title" required 
                           placeholder="Enter topic title">
                </div>
                <div class="form-group">
                    <label for="topic-summary">Summary</label>
                    <textarea id="topic-summary" name="summary" rows="3"
                              placeholder="Brief summary of the topic"></textarea>
                </div>
                <div class="form-group">
                    <label for="topic-description">Description PDF URL</label>
                    <input type="url" id="topic-description" name="description_pdf"
                           placeholder="URL to detailed description PDF">
                </div>
                <div style="display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 1rem;">
                    <button type="button" class="btn btn-outline" onclick="app.closeModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Create Topic</button>
                </div>
            </form>
        `
    );

    // Add form submit handler
    document
      .getElementById("create-topic-form")
      .addEventListener("submit", async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const topicData = {
          title: formData.get("title"),
          summary: formData.get("summary"),
          description_pdf: formData.get("description_pdf"),
        };

        try {
          await this.apiCall("/topics", "POST", topicData);
          this.showToast("Topic created successfully!", "success");
          this.closeModal();
          if (
            document
              .querySelector('[data-page="topics"]')
              .classList.contains("active")
          ) {
            this.loadTopics();
          }
        } catch (error) {
          this.showToast(error.message || "Failed to create topic", "error");
        }
      });
  }

  renderStudentActions(thesis, committee) {
    switch (thesis.state) {
      case "UNDER_ASSIGNMENT":
        return `
           <div class="action-group">
             <h5>Committee Selection</h5>
             <p>Select instructors for your three-member committee:</p>
             <button class="btn btn-primary" onclick="app.selectCommitteeMembers(${
               thesis.id
             })">
               <i class="fas fa-users"></i>
               Select Committee Members
             </button>
             ${
               committee.length > 0
                 ? `
               <div class="committee-status">
                 <p>Committee invitations: ${
                   committee.filter((m) => m.accepted_at).length
                 } accepted, 
                 ${
                   committee.filter((m) => !m.accepted_at && !m.rejected_at)
                     .length
                 } pending</p>
                 ${
                   committee.filter((m) => m.accepted_at).length >= 2
                     ? '<p class="success-message"><i class="fas fa-check"></i> Ready to proceed - thesis will automatically become active!</p>'
                     : '<p class="info-message">Need at least 2 committee members to accept.</p>'
                 }
               </div>
             `
                 : ""
             }
           </div>
         `;

      case "ACTIVE":
        return `
           <div class="action-group">
             <h5>Thesis Development</h5>
             <div class="action-buttons">
               <button class="btn btn-primary" onclick="app.uploadThesisDraft(${thesis.id})">
                 <i class="fas fa-upload"></i>
                 Upload Draft
               </button>
               <button class="btn btn-outline" onclick="app.addMaterials(${thesis.id})">
                 <i class="fas fa-link"></i>
                 Add Materials
               </button>
               <button class="btn btn-outline" onclick="app.editProfile()">
                 <i class="fas fa-user-edit"></i>
                 Edit Profile
               </button>
             </div>
           </div>
         `;

      case "UNDER_REVIEW":
        return `
           <div class="action-group">
             <h5>Examination Phase</h5>
             <div class="action-buttons">
               <button class="btn btn-primary" onclick="app.scheduleExamination(${thesis.id})">
                 <i class="fas fa-calendar"></i>
                 Schedule Examination
               </button>
               <button class="btn btn-outline" onclick="app.uploadFinalVersion(${thesis.id})">
                 <i class="fas fa-upload"></i>
                 Upload Final Version
               </button>
               <button class="btn btn-outline" onclick="app.addLibraryLink(${thesis.id})">
                 <i class="fas fa-link"></i>
                 Add Library Link
               </button>
             </div>
           </div>
         `;

      case "COMPLETED":
        return `
           <div class="action-group">
             <h5>Completed Thesis</h5>
             <p>Your thesis has been completed. You can view the examination report below.</p>
             <button class="btn btn-outline" onclick="app.viewExaminationReport(${thesis.id})">
               <i class="fas fa-file-alt"></i>
               View Examination Report
             </button>
           </div>
         `;

      default:
        return "<p>No actions available for this thesis state.</p>";
    }
  }

  editTopic(topicId) {
    // First load the existing topic data
    this.showModal(
      "Edit Topic",
      `
       <div class="loading-placeholder">Loading topic data...</div>
     `
    );

    // In a real implementation, fetch the topic data first
    setTimeout(async () => {
      try {
        const response = await this.apiCall(`/topics/${topicId}`);
        const topic = response.topic;

        document.getElementById("modal-body").innerHTML = `
           <form id="edit-topic-form" style="display: flex; flex-direction: column; gap: 1rem;">
             <div class="form-group">
               <label for="edit-topic-title">Title *</label>
               <input type="text" id="edit-topic-title" name="title" required 
                      value="${this.escapeHtml(
                        topic.title
                      )}" placeholder="Enter topic title">
             </div>
             <div class="form-group">
               <label for="edit-topic-summary">Summary</label>
               <textarea id="edit-topic-summary" name="summary" rows="3"
                         placeholder="Brief summary of the topic">${this.escapeHtml(
                           topic.summary || ""
                         )}</textarea>
             </div>
             <div class="form-group">
               <label for="edit-topic-description">Description PDF URL</label>
               <input type="url" id="edit-topic-description" name="description_pdf"
                      value="${
                        topic.description_pdf || ""
                      }" placeholder="URL to detailed description PDF">
             </div>
             <div style="display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 1rem;">
               <button type="button" class="btn btn-outline" onclick="app.closeModal()">Cancel</button>
               <button type="submit" class="btn btn-primary">Update Topic</button>
             </div>
           </form>
         `;

        // Add form submit handler
        document
          .getElementById("edit-topic-form")
          .addEventListener("submit", async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const topicData = {
              title: formData.get("title"),
              summary: formData.get("summary"),
              description_pdf: formData.get("description_pdf"),
            };

            try {
              await this.apiCall(`/topics/${topicId}`, "PUT", topicData);
              this.showToast("Topic updated successfully!", "success");
              this.closeModal();
              if (
                document
                  .querySelector('[data-page="topics"]')
                  .classList.contains("active")
              ) {
                this.loadTopics();
              }
            } catch (error) {
              this.showToast(
                error.message || "Failed to update topic",
                "error"
              );
            }
          });
      } catch (error) {
        document.getElementById("modal-body").innerHTML = `
           <div style="text-align: center; color: var(--error-color);">
             <p>Failed to load topic data: ${error.message}</p>
             <button class="btn btn-outline" onclick="app.closeModal()" style="margin-top: 1rem;">Close</button>
           </div>
         `;
      }
    }, 500);
  }

  // Student action functions
  async selectCommitteeMembers(thesisId) {
    this.showModal(
      "Select Committee Members",
      `<div class="loading-placeholder">Loading available instructors...</div>`
    );

    try {
      const response = await this.apiCall(
        `/invitations/theses/${thesisId}/available-instructors`
      );
      const instructors = response.instructors || [];

      document.getElementById("modal-body").innerHTML = `
         <div class="committee-selection">
           <p>Select instructors to invite to your three-member committee:</p>
           <div class="instructors-list">
             ${instructors
               .map(
                 (instructor) => `
               <div class="instructor-item">
                 <div class="instructor-info">
                   <strong>${this.escapeHtml(instructor.full_name)}</strong>
                   <span class="instructor-email">${this.escapeHtml(
                     instructor.email
                   )}</span>
                 </div>
                 <button class="btn btn-outline btn-sm" onclick="app.inviteCommitteeMember(${thesisId}, ${
                   instructor.id
                 }, '${this.escapeHtml(instructor.full_name)}')">
                   <i class="fas fa-paper-plane"></i>
                   Invite
                 </button>
               </div>
             `
               )
               .join("")}
           </div>
           <div style="margin-top: 1rem; text-align: center;">
             <button class="btn btn-secondary" onclick="app.closeModal()">Close</button>
           </div>
         </div>
       `;
    } catch (error) {
      document.getElementById("modal-body").innerHTML = `
         <div class="error-state">
           <p>Failed to load instructors: ${error.message}</p>
           <button class="btn btn-outline" onclick="app.closeModal()">Close</button>
         </div>
       `;
    }
  }

  async inviteCommitteeMember(thesisId, instructorId, instructorName) {
    try {
      await this.apiCall(`/invitations/theses/${thesisId}/invite`, "POST", {
        instructor_id: instructorId,
        role: "member",
      });

      this.showToast(`Invitation sent to ${instructorName}!`, "success");
      this.closeModal();

      // Refresh the thesis details if open
      if (
        document
          .querySelector('[data-page="theses"]')
          .classList.contains("active")
      ) {
        this.loadTheses();
      }
    } catch (error) {
      this.showToast(error.message || "Failed to send invitation", "error");
    }
  }

  async editProfile() {
    this.showModal(
      "Edit Profile",
      `<div class="loading-placeholder">Loading profile...</div>`
    );

    try {
      // Load current profile data from API
      const response = await this.apiCall("/auth/profile");
      const userData = response.user || this.user;

      document.getElementById("modal-body").innerHTML = `
         <form id="profile-form" style="display: flex; flex-direction: column; gap: 1rem;">
           <div class="form-group">
             <label for="profile-address">Full Address</label>
             <textarea id="profile-address" name="address" rows="3" 
                       placeholder="Enter your full postal address">${this.escapeHtml(
                         userData.address || ""
                       )}</textarea>
           </div>
           <div class="form-group">
             <label for="profile-phone">Phone Number</label>
             <input type="tel" id="profile-phone" name="phone" 
                    value="${this.escapeHtml(
                      userData.phone || ""
                    )}" placeholder="Phone number (mobile or landline)">
           </div>
           <div class="form-group">
             <label>Contact Email (Read-only)</label>
             <input type="email" value="${this.escapeHtml(
               userData.email
             )}" readonly 
                    style="background: #f5f5f5; cursor: not-allowed;">
             <small style="color: #666; font-size: 0.85em;">Email changes require administrator assistance</small>
           </div>
           <div style="display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 1rem;">
             <button type="button" class="btn btn-outline" onclick="app.closeModal()">Cancel</button>
             <button type="submit" class="btn btn-primary">Save Profile</button>
           </div>
         </form>
       `;

      // Add form submit handler
      document
        .getElementById("profile-form")
        .addEventListener("submit", async (e) => {
          e.preventDefault();
          const formData = new FormData(e.target);
          const profileData = {
            address: formData.get("address"),
            phone: formData.get("phone"),
          };

          try {
            const response = await this.apiCall(
              "/auth/profile",
              "PUT",
              profileData
            );
            this.user = response.user; // Update local user data
            this.showToast("Profile updated successfully!", "success");
            this.closeModal();
            // Refresh profile summary on dashboard
            if (document.getElementById("profile-summary")) {
              this.loadProfileSummary();
            }
          } catch (error) {
            this.showToast(
              error.message || "Failed to update profile",
              "error"
            );
          }
        });
    } catch (error) {
      document.getElementById("modal-body").innerHTML = `
        <div class="error-message">
          <i class="fas fa-exclamation-triangle"></i>
          Failed to load profile data. Please try again.
        </div>
      `;
    }
  }

  async uploadThesisDraft(thesisId) {
    this.showModal(
      "Upload Thesis Draft",
      `
       <div class="upload-form">
         <p>Upload your thesis draft for committee review:</p>
         <form id="upload-draft-form" style="display: flex; flex-direction: column; gap: 1rem;">
           <div class="form-group">
             <label for="thesis-file">Thesis File</label>
             <input type="file" id="thesis-file" name="files" 
                    accept=".pdf,.doc,.docx,.txt" required>
             <small style="color: #666; font-size: 0.85em;">
               Supported formats: PDF, DOC, DOCX, TXT (Max 10MB)
             </small>
           </div>
           <div class="form-group">
             <label>
               <input type="checkbox" id="is-draft" name="is_draft" checked>
               Mark as draft (can be updated later)
             </label>
           </div>
           <div style="display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 1rem;">
             <button type="button" class="btn btn-outline" onclick="app.closeModal()">Cancel</button>
             <button type="submit" class="btn btn-primary">
               <span class="upload-text">Upload Draft</span>
               <span class="upload-spinner" style="display: none;">
                 <i class="fas fa-spinner fa-spin"></i> Uploading...
               </span>
             </button>
           </div>
         </form>
       </div>
     `
    );

    // Add real file upload functionality
    document
      .getElementById("upload-draft-form")
      .addEventListener("submit", async (e) => {
        e.preventDefault();
        await this.handleFileUpload(e.target, thesisId, true); // true = is_draft
      });
  }

  async handleFileUpload(form, thesisId, isDraft = true) {
    const fileInput = form.querySelector('input[type="file"]');
    const submitButton = form.querySelector('button[type="submit"]');
    const uploadText = submitButton.querySelector(".upload-text");
    const uploadSpinner = submitButton.querySelector(".upload-spinner");

    if (!fileInput.files || fileInput.files.length === 0) {
      this.showToast("Please select a file to upload", "error");
      return;
    }

    try {
      // Show loading state
      uploadText.style.display = "none";
      uploadSpinner.style.display = "inline";
      submitButton.disabled = true;

      // Create FormData for file upload
      const formData = new FormData();
      formData.append("files", fileInput.files[0]);
      formData.append("is_draft", isDraft.toString());

      // Upload file
      const response = await fetch(
        `/api/attachments/theses/${thesisId}/upload`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.token}`,
          },
          body: formData,
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Upload failed");
      }

      this.showToast(
        result.message || "File uploaded successfully!",
        "success"
      );
      this.closeModal();

      // Refresh the thesis view to show new attachment
      if (document.querySelector(".thesis-detail")) {
        this.loadThesisDetail(thesisId);
      }
    } catch (error) {
      console.error("Upload error:", error);
      this.showToast(error.message || "Failed to upload file", "error");
    } finally {
      // Reset loading state
      uploadText.style.display = "inline";
      uploadSpinner.style.display = "none";
      submitButton.disabled = false;
    }
  }

  async handleMultipleFileUpload(form, thesisId, isDraft = true) {
    const fileInput = form.querySelector('input[type="file"]');
    const submitButton = form.querySelector('button[type="submit"]');
    const uploadText = submitButton.querySelector(".upload-text");
    const uploadSpinner = submitButton.querySelector(".upload-spinner");

    if (!fileInput.files || fileInput.files.length === 0) {
      this.showToast("Please select at least one file to upload", "error");
      return;
    }

    try {
      // Show loading state
      uploadText.style.display = "none";
      uploadSpinner.style.display = "inline";
      submitButton.disabled = true;

      // Create FormData for multiple file upload
      const formData = new FormData();

      // Add all selected files
      for (let i = 0; i < fileInput.files.length; i++) {
        formData.append("files", fileInput.files[i]);
      }
      formData.append("is_draft", isDraft.toString());

      // Upload files
      const response = await fetch(
        `/api/attachments/theses/${thesisId}/upload`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.token}`,
          },
          body: formData,
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Upload failed");
      }

      this.showToast(
        result.message || "Files uploaded successfully!",
        "success"
      );
      this.closeModal();

      // Refresh the thesis view to show new attachments
      if (document.querySelector(".thesis-detail")) {
        this.loadThesisDetail(thesisId);
      }
    } catch (error) {
      console.error("Upload error:", error);
      this.showToast(error.message || "Failed to upload files", "error");
    } finally {
      // Reset loading state
      uploadText.style.display = "inline";
      uploadSpinner.style.display = "none";
      submitButton.disabled = false;
    }
  }

  scheduleExamination(thesisId) {
    this.showModal(
      "Schedule Examination",
      `
       <form id="schedule-form" style="display: flex; flex-direction: column; gap: 1rem;">
         <div class="form-group">
           <label for="exam-date">Examination Date</label>
           <input type="date" id="exam-date" name="date" required>
         </div>
         <div class="form-group">
           <label for="exam-time">Examination Time</label>
           <input type="time" id="exam-time" name="time" required>
         </div>
         <div class="form-group">
           <label for="exam-mode">Examination Mode</label>
           <select id="exam-mode" name="mode" required onchange="app.toggleExamMode(this.value)">
             <option value="">Select mode...</option>
             <option value="in-person">In-Person</option>
             <option value="online">Online</option>
           </select>
         </div>
         <div class="form-group" id="room-group" style="display: none;">
           <label for="exam-room">Examination Room</label>
           <input type="text" id="exam-room" name="room" placeholder="Room number or location">
         </div>
         <div class="form-group" id="link-group" style="display: none;">
           <label for="exam-link">Online Meeting Link</label>
           <input type="url" id="exam-link" name="online_link" placeholder="Zoom, Teams, or other meeting link">
         </div>
         <div style="display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 1rem;">
           <button type="button" class="btn btn-outline" onclick="app.closeModal()">Cancel</button>
           <button type="submit" class="btn btn-primary">Schedule</button>
         </div>
       </form>
     `
    );

    document
      .getElementById("schedule-form")
      .addEventListener("submit", async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const scheduleData = {
          scheduled_at: `${formData.get("date")}T${formData.get(
            "time"
          )}:00.000Z`,
          mode: formData.get("mode"),
          room: formData.get("room"),
          online_link: formData.get("online_link"),
        };

        try {
          await this.apiCall(
            `/presentations/theses/${thesisId}`,
            "POST",
            scheduleData
          );
          this.showToast("Examination scheduled successfully!", "success");
          this.closeModal();
        } catch (error) {
          this.showToast(
            error.message || "Failed to schedule examination",
            "error"
          );
        }
      });
  }

  toggleExamMode(mode) {
    const roomGroup = document.getElementById("room-group");
    const linkGroup = document.getElementById("link-group");

    if (mode === "in-person") {
      roomGroup.style.display = "block";
      linkGroup.style.display = "none";
    } else if (mode === "online") {
      roomGroup.style.display = "none";
      linkGroup.style.display = "block";
    } else {
      roomGroup.style.display = "none";
      linkGroup.style.display = "none";
    }
  }

  // Placeholder functions for remaining features
  async addMaterials(thesisId) {
    this.showModal(
      "Add Materials",
      `
       <div class="upload-form">
         <p>Upload additional materials for your thesis:</p>
         <form id="upload-materials-form" style="display: flex; flex-direction: column; gap: 1rem;">
           <div class="form-group">
             <label for="material-files">Material Files</label>
             <input type="file" id="material-files" name="files" 
                    accept=".pdf,.doc,.docx,.txt,.zip,.jpg,.jpeg,.png,.gif" multiple>
             <small style="color: #666; font-size: 0.85em;">
               Supported: PDF, DOC, DOCX, TXT, ZIP, Images. Multiple files allowed (Max 10MB each)
             </small>
           </div>
           <div class="form-group">
             <label>
               <input type="checkbox" id="is-not-draft" name="is_draft">
               Mark as final materials (not draft)
             </label>
           </div>
           <div style="display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 1rem;">
             <button type="button" class="btn btn-outline" onclick="app.closeModal()">Cancel</button>
             <button type="submit" class="btn btn-primary">
               <span class="upload-text">Upload Materials</span>
               <span class="upload-spinner" style="display: none;">
                 <i class="fas fa-spinner fa-spin"></i> Uploading...
               </span>
             </button>
           </div>
         </form>
       </div>
     `
    );

    // Add real file upload functionality
    document
      .getElementById("upload-materials-form")
      .addEventListener("submit", async (e) => {
        e.preventDefault();
        const isDraft = !e.target.querySelector("#is-not-draft").checked;
        await this.handleMultipleFileUpload(e.target, thesisId, isDraft);
      });
  }

  async uploadFinalVersion(thesisId) {
    this.showModal(
      "Upload Final Version",
      `
       <div class="upload-form">
         <p>Upload the final version of your thesis:</p>
         <form id="upload-final-form" style="display: flex; flex-direction: column; gap: 1rem;">
           <div class="form-group">
             <label for="final-file">Final Thesis File</label>
             <input type="file" id="final-file" name="files" 
                    accept=".pdf,.doc,.docx" required>
             <small style="color: #666; font-size: 0.85em;">
               Supported formats: PDF, DOC, DOCX (Max 10MB)
             </small>
           </div>
           <div class="form-group">
             <small style="color: #e74c3c; font-weight: 500;">
               ⚠️ This will be marked as the final version for examination
             </small>
           </div>
           <div style="display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 1rem;">
             <button type="button" class="btn btn-outline" onclick="app.closeModal()">Cancel</button>
             <button type="submit" class="btn btn-primary">
               <span class="upload-text">Upload Final Version</span>
               <span class="upload-spinner" style="display: none;">
                 <i class="fas fa-spinner fa-spin"></i> Uploading...
               </span>
             </button>
           </div>
         </form>
       </div>
     `
    );

    // Add real file upload functionality
    document
      .getElementById("upload-final-form")
      .addEventListener("submit", async (e) => {
        e.preventDefault();
        await this.handleFileUpload(e.target, thesisId, false); // false = not draft, final version
      });
  }

  addLibraryLink(thesisId) {
    this.showModal(
      "Add Library Link",
      `
       <form id="library-form" style="display: flex; flex-direction: column; gap: 1rem;">
         <div class="form-group">
           <label for="library-url">Nimertis Repository URL</label>
           <input type="url" id="library-url" name="library_url" required 
                  placeholder="https://nimertis.lib.uni.edu/...">
         </div>
         <div style="display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 1rem;">
           <button type="button" class="btn btn-outline" onclick="app.closeModal()">Cancel</button>
           <button type="submit" class="btn btn-primary">Save Link</button>
         </div>
       </form>
     `
    );

    document.getElementById("library-form").addEventListener("submit", (e) => {
      e.preventDefault();
      this.showToast("Library link saved successfully!", "success");
      this.closeModal();
    });
  }

  viewExaminationReport(thesisId) {
    this.showToast("Examination report view coming soon!", "info");
  }

  // UI utility methods
  showLogin() {
    document.getElementById("login-page").classList.remove("hidden");
    document.getElementById("dashboard-page").classList.add("hidden");
  }

  showDashboard() {
    document.getElementById("login-page").classList.add("hidden");
    document.getElementById("dashboard-page").classList.remove("hidden");
    this.showPage("overview");
  }

  showLoading(show) {
    const loading = document.getElementById("loading");
    if (show) {
      loading.classList.remove("hidden");
    } else {
      loading.classList.add("hidden");
    }
  }

  showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 5000);
  }

  showModal(title, content) {
    document.getElementById("modal-title").textContent = title;
    document.getElementById("modal-body").innerHTML = content;
    document.getElementById("modal-overlay").classList.remove("hidden");
  }

  closeModal() {
    document.getElementById("modal-overlay").classList.add("hidden");
  }

  // Utility methods
  async apiCall(endpoint, method = "GET", data = null) {
    const url = this.apiBase + endpoint;
    const config = {
      method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (this.token) {
      config.headers.Authorization = `Bearer ${this.token}`;
    }

    if (data && method !== "GET") {
      config.body = JSON.stringify(data);
    }

    const response = await fetch(url, config);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || `HTTP ${response.status}`);
    }

    return result;
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  formatDate(dateString) {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  async viewThesisDetails(thesisId) {
    try {
      // Fetch thesis details, committee, and attachments in parallel
      const [thesisResponse, committeeResponse, attachmentsResponse] =
        await Promise.all([
          this.apiCall(`/theses/${thesisId}`),
          this.apiCall(`/invitations/theses/${thesisId}/committee`),
          this.apiCall(`/attachments/theses/${thesisId}`),
        ]);

      const thesis = thesisResponse.thesis;
      const committee = committeeResponse.committee || [];
      const attachments = attachmentsResponse.attachments || [];

      this.showModal(
        `Thesis Details: ${thesis.topic_title}`,
        `
          <div class="thesis-detail">
            <div class="detail-section">
              <h4><i class="fas fa-info-circle"></i> Basic Information</h4>
              <div class="detail-grid">
                <div class="detail-item">
                  <strong>Student:</strong> ${this.escapeHtml(
                    thesis.student_name
                  )}
                </div>
                <div class="detail-item">
                  <strong>Supervisor:</strong> ${this.escapeHtml(
                    thesis.supervisor_name
                  )}
                </div>
                <div class="detail-item">
                  <strong>Status:</strong> 
                  <span class="meta-tag state-${thesis.state
                    .toLowerCase()
                    .replace("_", "-")}">
                    ${thesis.state.replace("_", " ")}
                  </span>
                </div>
                <div class="detail-item">
                  <strong>Assigned:</strong> ${this.formatDate(
                    thesis.assigned_at
                  )}
                </div>
                ${
                  thesis.started_at
                    ? `
                <div class="detail-item">
                  <strong>Started:</strong> ${this.formatDate(
                    thesis.started_at
                  )}
                </div>
                `
                    : ""
                }
                ${
                  thesis.finalized_at
                    ? `
                <div class="detail-item">
                  <strong>Finalized:</strong> ${this.formatDate(
                    thesis.finalized_at
                  )}
                </div>
                `
                    : ""
                }
              </div>
            </div>

            ${
              committee.length > 0
                ? `
            <div class="detail-section">
              <h4><i class="fas fa-users"></i> Committee Members</h4>
              <div class="committee-list">
                ${committee
                  .map(
                    (member) => `
                  <div class="committee-member">
                    <span class="member-name">${this.escapeHtml(
                      member.instructor_name
                    )}</span>
                    <span class="member-role">${member.committee_role}</span>
                    ${
                      member.accepted_at
                        ? '<span class="member-status accepted"><i class="fas fa-check"></i> Accepted</span>'
                        : '<span class="member-status pending"><i class="fas fa-clock"></i> Pending</span>'
                    }
                  </div>
                `
                  )
                  .join("")}
              </div>
            </div>
            `
                : ""
            }

            <div class="detail-section">
              <h4><i class="fas fa-paperclip"></i> Attachments & Files</h4>
              ${
                attachments.length > 0
                  ? `
                <div class="attachments-list">
                  ${attachments
                    .map(
                      (file) => `
                    <div class="attachment-item">
                      <div class="attachment-info">
                        <i class="fas fa-file${this.getFileIcon(
                          file.mime
                        )}"></i>
                        <div class="attachment-details">
                          <div class="attachment-name">${this.escapeHtml(
                            file.filename
                          )}</div>
                          <div class="attachment-meta">
                            ${
                              file.is_draft
                                ? '<span class="draft-badge">DRAFT</span>'
                                : '<span class="final-badge">FINAL</span>'
                            }
                            <span class="upload-date">Uploaded ${this.formatDate(
                              file.uploaded_at
                            )}</span>
                          </div>
                        </div>
                      </div>
                      <div class="attachment-actions">
                        <button class="btn btn-sm btn-outline" onclick="app.downloadAttachment(${
                          file.id
                        })">
                          <i class="fas fa-download"></i> Download
                        </button>
                        ${
                          this.canDeleteAttachment(file)
                            ? `
                          <button class="btn btn-sm btn-outline-danger" onclick="app.deleteAttachment(${file.id}, ${thesisId})">
                            <i class="fas fa-trash"></i>
                          </button>
                        `
                            : ""
                        }
                      </div>
                    </div>
                  `
                    )
                    .join("")}
                </div>
              `
                  : `
                <div class="no-attachments">
                  <i class="fas fa-inbox fa-2x"></i>
                  <p>No files uploaded yet</p>
                  ${
                    this.canUploadToThesis(thesis)
                      ? `
                    <button class="btn btn-primary" onclick="app.closeModal(); app.uploadThesisDraft(${thesisId});">
                      <i class="fas fa-upload"></i> Upload First Draft
                    </button>
                  `
                      : ""
                  }
                </div>
              `
              }
            </div>

            ${
              this.canViewActions(thesis)
                ? `
            <div class="detail-section">
              <h4><i class="fas fa-cog"></i> Actions</h4>
              <div class="thesis-actions">
                ${this.renderStudentActions(thesis, committee)}
              </div>
            </div>
            `
                : ""
            }
          </div>
        `,
        "large"
      );
    } catch (error) {
      console.error("Failed to load thesis details:", error);
      this.showToast("Failed to load thesis details", "error");
    }
  }

  getFileIcon(mimeType) {
    if (mimeType.includes("pdf")) return "-pdf";
    if (mimeType.includes("word") || mimeType.includes("document"))
      return "-word";
    if (mimeType.includes("image")) return "-image";
    if (mimeType.includes("zip")) return "-archive";
    return "";
  }

  canDeleteAttachment(file) {
    // Students can delete their own files that are drafts
    return this.user && this.user.id === file.uploaded_by && file.is_draft;
  }

  canUploadToThesis(thesis) {
    return (
      this.user &&
      this.user.role === "student" &&
      this.user.id === thesis.student_id &&
      ["ACTIVE", "UNDER_REVIEW"].includes(thesis.state)
    );
  }

  canViewActions(thesis) {
    return (
      this.user &&
      ((this.user.role === "student" && this.user.id === thesis.student_id) ||
        this.user.role === "secretary" ||
        this.user.id === thesis.supervisor_id)
    );
  }

  async downloadAttachment(attachmentId) {
    try {
      window.open(`/api/attachments/${attachmentId}/download`, "_blank");
    } catch (error) {
      this.showToast("Failed to download file", "error");
    }
  }

  async deleteAttachment(attachmentId, thesisId) {
    if (!confirm("Are you sure you want to delete this file?")) {
      return;
    }

    try {
      await this.apiCall(`/attachments/${attachmentId}`, "DELETE");
      this.showToast("File deleted successfully", "success");
      // Refresh the thesis details
      this.viewThesisDetails(thesisId);
    } catch (error) {
      this.showToast("Failed to delete file", "error");
    }
  }
}

// Global functions for onclick handlers
window.showPage = function (page) {
  app.showPage(page);
};

window.createNewTopic = function () {
  app.createNewTopic();
};

window.editTopic = function (topicId) {
  app.editTopic(topicId);
};

window.exportTheses = function () {
  app.exportTheses();
};

window.generateReport = function () {
  app.generateReport();
};

window.closeModal = function () {
  app.closeModal();
};

// Initialize the application
const app = new ThesisApp();

// Handle modal overlay clicks
document.getElementById("modal-overlay").addEventListener("click", (e) => {
  if (e.target === e.currentTarget) {
    app.closeModal();
  }
});

// Handle escape key to close modal
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    app.closeModal();
  }
});
