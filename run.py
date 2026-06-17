#!/usr/bin/env python3
"""
Blood Donation Management System (BDMS) - Setup & Run Script
This script installs all dependencies and starts both the backend and frontend servers.
"""

import os
import sys
import subprocess
import time
import signal
import platform
from pathlib import Path

# Configuration
PROJECT_ROOT = Path(__file__).parent.resolve()
SERVER_DIR = PROJECT_ROOT / "server"
CLIENT_DIR = PROJECT_ROOT / "client"
BACKEND_PORT = 3001
FRONTEND_PORT = 5173

# ANSI color codes for better output
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    END = '\033[0m'
    BOLD = '\033[1m'

def print_banner():
    """Print the application banner."""
    print(f"""
{Colors.CYAN}{Colors.BOLD}{'='*55}
   Blood Donation Management System (BDMS)
{'='*55}{Colors.END}
""")

def print_step(message):
    """Print a step message."""
    print(f"{Colors.BLUE}[STEP]{Colors.END} {message}")

def print_success(message):
    """Print a success message."""
    print(f"{Colors.GREEN}[OK]{Colors.END} {message}")

def print_warning(message):
    """Print a warning message."""
    print(f"{Colors.YELLOW}[WARN]{Colors.END} {message}")

def print_error(message):
    """Print an error message."""
    print(f"{Colors.RED}[ERROR]{Colors.END} {message}")

def run_command(command, cwd, description="", check=True):
    """Run a shell command and handle errors."""
    if description:
        print_step(description)
    try:
        result = subprocess.run(
            command,
            cwd=cwd,
            shell=True,
            check=check,
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='replace',
            env=os.environ.copy()
        )
        if result.stdout:
            # Only print non-empty output lines
            output = result.stdout.strip()
            if output:
                # Print last few lines to avoid clutter
                lines = output.split('\n')
                for line in lines[-3:]:
                    if line.strip():
                        print(f"  {line}")
        return result.returncode == 0
    except subprocess.CalledProcessError as e:
        print_error(f"Command failed: {command}")
        if e.stderr:
            print(f"  Error: {e.stderr.strip()[:500]}")
        return False
    except FileNotFoundError:
        print_error(f"Command not found: {command.split()[0]}")
        return False

def find_node_path():
    """Find Node.js installation path."""
    # Common Node.js installation paths on Windows
    common_paths = [
        r"C:\Program Files\nodejs",
        r"C:\Program Files (x86)\nodejs",
        os.path.join(os.environ.get('LOCALAPPDATA', ''), "Programs", "node"),
        os.path.join(os.environ.get('APPDATA', ''), "npm"),
    ]
    
    # Check if node is already in PATH
    try:
        result = subprocess.run(["node", "--version"], capture_output=True, text=True)
        if result.returncode == 0:
            return None  # Already in PATH
    except FileNotFoundError:
        pass
    
    # Check common paths
    for path in common_paths:
        node_exe = os.path.join(path, "node.exe")
        if os.path.exists(node_exe):
            return path
    
    return None

NODE_PATH = None  # Will be set if Node.js is found

def find_node_path():
    """Find Node.js installation path."""
    # Common Node.js installation paths on Windows
    common_paths = [
        r"C:\Program Files\nodejs",
        r"C:\Program Files (x86)\nodejs",
        os.path.join(os.environ.get('LOCALAPPDATA', ''), "Programs", "node"),
        os.path.join(os.environ.get('APPDATA', ''), "npm"),
    ]
    
    # Check common paths
    for path in common_paths:
        node_exe = os.path.join(path, "node.exe")
        if os.path.exists(node_exe):
            return path
    
    return None

def add_node_to_path():
    """Add Node.js to PATH if not already there."""
    global NODE_PATH
    node_path = find_node_path()
    if node_path:
        print_step(f"Found Node.js at {node_path}")
        NODE_PATH = node_path
        os.environ["PATH"] = node_path + os.pathsep + os.environ.get("PATH", "")
        return True
    return False

def check_node_installed():
    """Check if Node.js and npm are installed."""
    global NODE_PATH
    print_step("Checking Node.js installation...")
    
    # Try to find Node.js if not in PATH
    if add_node_to_path():
        print_success("Node.js found and added to PATH")
    
    try:
        # Use full paths if available
        node_cmd = os.path.join(NODE_PATH, "node.exe") if NODE_PATH else "node"
        npm_cmd = os.path.join(NODE_PATH, "npm.cmd") if NODE_PATH else "npm"
        
        node_version = subprocess.run(
            [node_cmd, "--version"],
            capture_output=True,
            text=True,
            shell=True
        ).stdout.strip()
        npm_version = subprocess.run(
            [npm_cmd, "--version"],
            capture_output=True,
            text=True,
            shell=True
        ).stdout.strip()
        
        if node_version and npm_version:
            print_success(f"Node.js {node_version} found")
            print_success(f"npm {npm_version} found")
            return True
        else:
            raise FileNotFoundError("Node.js not found")
    except FileNotFoundError:
        print_error("Node.js is not installed or not in PATH!")
        print(f"  Please install Node.js from: {Colors.CYAN}https://nodejs.org{Colors.END}")
        print(f"  Choose the LTS version for best compatibility.")
        return False

def check_python_version():
    """Check Python version."""
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 7):
        print_error("Python 3.7 or higher is required!")
        return False
    print_success(f"Python {version.major}.{version.minor}.{version.micro} found")
    return True

def install_server_dependencies():
    """Install server (backend) dependencies."""
    print_step("Installing backend dependencies...")
    
    # Check if node_modules already exists
    node_modules = SERVER_DIR / "node_modules"
    if node_modules.exists() and any(node_modules.iterdir()):
        print_success("Backend dependencies already installed (node_modules exists)")
        # Still run npm install to update if needed
        print_step("Updating backend dependencies...")
    
    if run_command("npm install", cwd=SERVER_DIR, check=False):
        print_success("Backend dependencies installed successfully")
        return True
    else:
        print_error("Failed to install backend dependencies")
        print(f"  Try running manually: {Colors.CYAN}cd server && npm install{Colors.END}")
        return False

def install_client_dependencies():
    """Install client (frontend) dependencies."""
    print_step("Installing frontend dependencies...")
    
    # Check if node_modules already exists
    node_modules = CLIENT_DIR / "node_modules"
    if node_modules.exists() and any(node_modules.iterdir()):
        print_success("Frontend dependencies already installed (node_modules exists)")
        print_step("Updating frontend dependencies...")
    
    if run_command("npm install", cwd=CLIENT_DIR, check=False):
        print_success("Frontend dependencies installed successfully")
        return True
    else:
        print_error("Failed to install frontend dependencies")
        print(f"  Try running manually: {Colors.CYAN}cd client && npm install{Colors.END}")
        return False

def setup_database():
    """Setup the SQLite database with Prisma."""
    print_step("Setting up database...")
    
    # Check if database already exists
    db_path = SERVER_DIR / "prisma" / "dev.db"
    if db_path.exists():
        print_success("Database already exists")
        return True
    
    # Push database schema
    print_step("Creating database schema...")
    if run_command("npx prisma db push", cwd=SERVER_DIR, check=False):
        print_success("Database schema created")
    else:
        print_warning("Database schema push had issues (database might already exist)")
    
    # Seed the database
    print_step("Seeding database with demo data...")
    if run_command("npm run seed", cwd=SERVER_DIR, check=False):
        print_success("Database seeded with demo data")
    else:
        print_warning("Seeding had issues (data might already exist)")
    
    return True

def check_port_available(port):
    """Check if a port is available."""
    import socket
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        result = sock.connect_ex(('127.0.0.1', port))
        return result != 0

def is_port_in_use(port):
    """Check if a port is already in use."""
    import socket
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        result = sock.connect_ex(('127.0.0.1', port))
        return result == 0

def start_servers():
    """Start both backend and frontend servers."""
    processes = []
    
    # Start backend server
    print_step(f"Starting backend server on port {BACKEND_PORT}...")
    
    if is_port_in_use(BACKEND_PORT):
        print_warning(f"Port {BACKEND_PORT} is already in use - backend might be running")
    else:
        backend_cmd = "npm run dev"
        if platform.system() == "Windows":
            # On Windows, use subprocess with CREATE_NEW_PROCESS_GROUP for proper cleanup
            backend_process = subprocess.Popen(
                backend_cmd,
                cwd=str(SERVER_DIR),
                shell=True,
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
        else:
            backend_process = subprocess.Popen(
                backend_cmd,
                cwd=str(SERVER_DIR),
                shell=True,
                preexec_fn=os.setsid,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
        processes.append(("backend", backend_process))
        time.sleep(2)  # Give backend time to start
        
        # Check if backend started
        if is_port_in_use(BACKEND_PORT):
            print_success(f"Backend server started on http://localhost:{BACKEND_PORT}")
        else:
            print_warning("Backend server might still be starting...")
    
    # Start frontend server
    print_step(f"Starting frontend server on port {FRONTEND_PORT}...")
    
    if is_port_in_use(FRONTEND_PORT):
        print_warning(f"Port {FRONTEND_PORT} is already in use - frontend might be running")
    else:
        frontend_cmd = "npm run dev"
        if platform.system() == "Windows":
            frontend_process = subprocess.Popen(
                frontend_cmd,
                cwd=str(CLIENT_DIR),
                shell=True,
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
        else:
            frontend_process = subprocess.Popen(
                frontend_cmd,
                cwd=str(CLIENT_DIR),
                shell=True,
                preexec_fn=os.setsid,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
        processes.append(("frontend", frontend_process))
        time.sleep(2)  # Give frontend time to start
        
        # Check if frontend started
        if is_port_in_use(FRONTEND_PORT):
            print_success(f"Frontend server started on http://localhost:{FRONTEND_PORT}")
        else:
            print_warning("Frontend server might still be starting...")
    
    return processes

def print_demo_accounts():
    """Print demo account information."""
    print(f"""
{Colors.CYAN}{Colors.BOLD}{'='*55}
   DEMO ACCOUNTS (Password: password123)
{'='*55}{Colors.END}
{Colors.GREEN}  admin@bdms.com{Colors.END}        -> SUPER_ADMIN
{Colors.GREEN}  bankadmin@bdms.com{Colors.END}    -> BLOOD_BANK_ADMIN
{Colors.GREEN}  hospital@bdms.com{Colors.END}     -> HOSPITAL_STAFF
{Colors.GREEN}  lab@bdms.com{Colors.END}          -> LAB_TECHNICIAN
{Colors.GREEN}  john@example.com{Colors.END}      -> DONOR
{Colors.GREEN}  jane@example.com{Colors.END}      -> DONOR
{Colors.GREEN}  bob@example.com{Colors.END}       -> DONOR
""")

def print_access_info():
    """Print access information."""
    print(f"""
{Colors.CYAN}{Colors.BOLD}{'='*55}
   ACCESS INFORMATION
{'='*55}{Colors.END}
{Colors.GREEN}{Colors.BOLD}  Frontend:{Colors.END}  http://localhost:{FRONTEND_PORT}
{Colors.GREEN}{Colors.BOLD}  Backend:{Colors.END}   http://localhost:{BACKEND_PORT}/api
{Colors.GREEN}{Colors.BOLD}  API Health:{Colors.END} http://localhost:{BACKEND_PORT}/api/health
""")

def cleanup_processes(processes):
    """Clean up background processes."""
    for name, process in processes:
        try:
            if platform.system() == "Windows":
                process.terminate()
            else:
                os.killpg(os.getpgid(process.pid), signal.SIGTERM)
        except Exception:
            pass

def main():
    """Main entry point."""
    print_banner()
    
    # Check prerequisites
    if not check_python_version():
        sys.exit(1)
    
    if not check_node_installed():
        sys.exit(1)
    
    print(f"\n{'='*55}")
    print(f"  INSTALLING DEPENDENCIES")
    print(f"{'='*55}\n")
    
    # Install dependencies
    if not install_server_dependencies():
        print_error("Failed to install server dependencies")
        sys.exit(1)
    
    if not install_client_dependencies():
        print_error("Failed to install client dependencies")
        sys.exit(1)
    
    print(f"\n{'='*55}")
    print(f"  DATABASE SETUP")
    print(f"{'='*55}\n")
    
    # Setup database
    setup_database()
    
    print(f"\n{'='*55}")
    print(f"  STARTING SERVERS")
    print(f"{'='*55}\n")
    
    # Start servers
    processes = start_servers()
    
    # Print info
    print_demo_accounts()
    print_access_info()
    
    print(f"{Colors.YELLOW}{Colors.BOLD}{'='*55}")
    print(f"  APPLICATION IS NOW RUNNING!")
    print(f"{'='*55}{Colors.END}")
    print(f"\n  Open your browser and go to: {Colors.GREEN}http://localhost:{FRONTEND_PORT}{Colors.END}")
    print(f"\n  Press {Colors.RED}Ctrl+C{Colors.END} to stop all servers.\n")
    
    # Wait for user to press Ctrl+C
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}Shutting down servers...{Colors.END}")
        cleanup_processes(processes)
        print(f"{Colors.GREEN}Servers stopped. Goodbye!{Colors.END}")
        sys.exit(0)

if __name__ == "__main__":
    main()
