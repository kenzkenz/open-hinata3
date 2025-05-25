<?php
$logFile = "/tmp/php_test_mbutil.log";
function logMessage($message) {
    global $logFile;
    file_put_contents($logFile, date("Y-m-d H:i:s") . " - $message\n", FILE_APPEND);
}

$mbUtilPath = "/var/www/venv/bin/mb-util";
$pythonPath = "/var/www/venv/lib/python3.12/site-packages"; // Python バージョンに応じて修正
$command = "PYTHONPATH=$pythonPath /var/www/venv/bin/python3 $mbUtilPath --help 2>&1";
logMessage("Checking mb-util at: $mbUtilPath");
logMessage("Command: $command");

// シェル環境のデバッグ
exec("whoami", $whoamiOutput, $whoamiReturn);
logMessage("whoami: " . implode("\n", $whoamiOutput));
exec("echo \$PATH", $pathOutput, $pathReturn);
logMessage("PATH: " . implode("\n", $pathOutput));
exec("/bin/ls /var/www/venv/bin", $lsOutput, $lsReturn);
logMessage("ls /var/www/venv/bin: " . implode("\n", $lsOutput));

if (file_exists($mbUtilPath)) {
    logMessage("file_exists: true");
    echo "file_exists: true\n";
} else {
    logMessage("file_exists: false");
    echo "file_exists: false\n";
}

if (is_executable($mbUtilPath)) {
    logMessage("is_executable: true");
    echo "is_executable: true\n";
} else {
    logMessage("is_executable: false");
    echo "is_executable: false\n";
}

exec($command, $output, $returnVar);
logMessage("exec return code: $returnVar");
logMessage("exec output: " . implode("\n", $output));
echo "Return code: $returnVar\nOutput: " . implode("\n", $output) . "\n";
?>