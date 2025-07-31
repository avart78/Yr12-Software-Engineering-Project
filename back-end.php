<?php
session_start();

// === Config - Database details ===
$DB_HOST = 'localhost';
$DB_USER = 'root'; 
$DB_PASS = 'root';     
$DB_NAME = 'procrastination_app';

// === DB CONNECTION ===
$conn = new mysqli($DB_HOST, $DB_USER, $DB_PASS, $DB_NAME);
if ($conn->connect_error) {
    http_response_code(500);
    die(json_encode(['error' => 'Database connection failed']));
}

// === HELPERS ===
function json_response($data) {
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

// === The Sign Up Functionality ===
if (isset($_GET['action']) && $_GET['action'] === 'signup' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = trim($_POST['email'] ?? '');
    $username = trim($_POST['username'] ?? '');
    $password = $_POST['password'] ?? '';

    if (!$email || !$username || !$password) {
        json_response(['error' => 'All fields required']);
    }

    $stmt = $conn->prepare("SELECT id FROM users WHERE email=? OR username=?");
    $stmt->bind_param("ss", $email, $username);
    $stmt->execute();
    $stmt->store_result();
    if ($stmt->num_rows > 0) {
        json_response(['error' => 'Email or username already exists']);
    }
    $stmt->close();

    $hash = password_hash($password, PASSWORD_DEFAULT);
    $default_profile_image = 'icon-for-user.png';
    $stmt = $conn->prepare("INSERT INTO users (email, username, password, profile_image) VALUES (?, ?, ?, ?)");
    $stmt->bind_param("ssss", $email, $username, $hash, $default_profile_image);
    if ($stmt->execute()) {
        $_SESSION['user_id'] = $stmt->insert_id;
        json_response(['success' => true]);
    } else {
        json_response(['error' => 'Registration failed']);
    }
}

// === Login Functionality ===
if (isset($_GET['action']) && $_GET['action'] === 'login' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';

    if (!$email || !$password) {
        json_response(['error' => 'All fields required']);
    }

    $stmt = $conn->prepare("SELECT id, password, username, profile_image FROM users WHERE email=?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $stmt->bind_result($id, $hash, $username, $profile_image);
    if ($stmt->fetch() && password_verify($password, $hash)) {
        $_SESSION['user_id'] = $id;
        json_response(['success' => true, 'username' => $username, 'profile_image' => $profile_image]);
    } else {
        json_response(['error' => 'Invalid credentials']);
    }
}

// === Logout feature ===
if (isset($_GET['action']) && $_GET['action'] === 'logout') {
    session_destroy();
    json_response(['success' => true]);
}

// === Session Check ===
if (isset($_GET['action']) && $_GET['action'] === 'session') {
    if (isset($_SESSION['user_id'])) {
        $stmt = $conn->prepare("SELECT username, profile_image FROM users WHERE id=?");
        $stmt->bind_param("i", $_SESSION['user_id']);
        $stmt->execute();
        $stmt->bind_result($username, $profile_image);
        $stmt->fetch();
        json_response(['logged_in' => true, 'username' => $username, 'profile_image' => $profile_image]);
    } else {
        json_response(['logged_in' => false]);
    }
}

// === Account Details (GET/UPDATE) ===
if (isset($_GET['action']) && $_GET['action'] === 'account') {
    if (!isset($_SESSION['user_id'])) {
        json_response(['error' => 'Not logged in']);
    }
    $user_id = $_SESSION['user_id'];

    // GET account details
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $stmt = $conn->prepare("SELECT email, username, profile_image FROM users WHERE id=?");
        $stmt->bind_param("i", $user_id);
        $stmt->execute();
        $stmt->bind_result($email, $username, $profile_image);
        $stmt->fetch();
        json_response(['email' => $email, 'username' => $username, 'profile_image' => $profile_image]);
    }

    // UPDATE account details
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $email = trim($_POST['email'] ?? '');
        $username = trim($_POST['username'] ?? '');
        $password = $_POST['password'] ?? '';
        $profile_image = null;

        // Handle profile image upload
        if (isset($_FILES['profile_image']) && $_FILES['profile_image']['error'] === UPLOAD_ERR_OK) {
            $ext = pathinfo($_FILES['profile_image']['name'], PATHINFO_EXTENSION);
            $filename = uniqid('profile_', true) . '.' . $ext;
            $target = __DIR__ . '/uploads/' . $filename;
            if (move_uploaded_file($_FILES['profile_image']['tmp_name'], $target)) {
                $profile_image = 'uploads/' . $filename;
            }
        }

        // Update password if provided
        if ($password) {
            $hash = password_hash($password, PASSWORD_DEFAULT);
            $stmt = $conn->prepare("UPDATE users SET email=?, username=?, password=?, profile_image=IFNULL(?, profile_image) WHERE id=?");
            $stmt->bind_param("ssssi", $email, $username, $hash, $profile_image, $user_id);
        } else {
            $stmt = $conn->prepare("UPDATE users SET email=?, username=?, profile_image=IFNULL(?, profile_image) WHERE id=?");
            $stmt->bind_param("sssi", $email, $username, $profile_image, $user_id);
        }
        if ($stmt->execute()) {
            json_response(['success' => true]);
        } else {
            json_response(['error' => 'Update failed']);
        }
    }
}

// === SESSION RATING ===
if (isset($_GET['action']) && $_GET['action'] === 'rate_session' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!isset($_SESSION['user_id'])) {
        json_response(['error' => 'Not logged in']);
        exit;
    }
    
    $rating = $_POST['rating'] ?? null;
    $user_id = $_SESSION['user_id'];
    
    if (!$rating || !is_numeric($rating) || $rating < 1 || $rating > 5) {
        json_response(['error' => 'Invalid rating']);
        exit;
    }
    
    $stmt = $conn->prepare("INSERT INTO session_ratings (user_id, rating, created_at) VALUES (?, ?, NOW())");
    $stmt->bind_param("ii", $user_id, $rating);
    
    if ($stmt->execute()) {
        json_response(['success' => true]);
    } else {
        json_response(['error' => 'Failed to save rating']);
    }
}

// === GET AVERAGE RATING ===
if (isset($_GET['action']) && $_GET['action'] === 'get_average_rating' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    if (!isset($_SESSION['user_id'])) {
        json_response(['error' => 'Not logged in']);
        exit;
    }
    
    $user_id = $_SESSION['user_id'];
    
    $stmt = $conn->prepare("SELECT AVG(rating) as average_rating, COUNT(*) as total_sessions FROM session_ratings WHERE user_id = ?");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $data = $result->fetch_assoc();
    
    $average = $data['average_rating'] ? round($data['average_rating'], 1) : 0.0;
    $total_sessions = $data['total_sessions'] ?: 0;
    
    json_response([
        'average_rating' => $average,
        'total_sessions' => $total_sessions
    ]);
}

json_response(['error' => 'Invalid request']);
?>
