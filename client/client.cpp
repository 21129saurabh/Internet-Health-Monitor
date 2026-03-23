#include <iostream>
#include <cstdio>
#include <memory>
#include <array>
#include <string>
#include <regex>

std::string exec(const char* cmd) {
    std::array<char, 128> buffer;
    std::string result;

    std::shared_ptr<FILE> pipe(popen(cmd, "r"), pclose);
    if (!pipe) return "";

    while (!feof(pipe.get())) {
        if (fgets(buffer.data(), 128, pipe.get()) != nullptr) {
            result += buffer.data();
        }
    }
    return result;
}

double extractLatency(const std::string& output) {
    std::regex latency_regex("min/avg/max/stddev = [0-9.]+/([0-9.]+)/");
    std::smatch match;

    if (std::regex_search(output, match, latency_regex)) {
        return std::stod(match[1]);
    }
    return 0;
}

double extractPacketLoss(const std::string& output) {
    std::regex loss_regex("(\\d+)% packet loss");
    std::smatch match;

    if (std::regex_search(output, match, loss_regex)) {
        return std::stod(match[1]);
    }
    return 0;
}

int main() {
    std::string google = exec("ping -c 2 google.com");
    std::string cloudflare = exec("ping -c 2 1.1.1.1");

    double latency_google = extractLatency(google);
    double latency_cf = extractLatency(cloudflare);
    double packet_loss = extractPacketLoss(google);

    std::string cmd =
        "curl -X POST http://localhost:3000/metrics "
        "-H \"Content-Type: application/json\" "
        "--data-raw \"{\\\"latency_google\\\": " + std::to_string(latency_google) +
        ", \\\"latency_cf\\\": " + std::to_string(latency_cf) +
        ", \\\"packet_loss\\\": " + std::to_string(packet_loss) + "}\"";

    system(cmd.c_str());

    std::cout << "Sent Data → Google: " << latency_google
              << " ms | Cloudflare: " << latency_cf
              << " ms | Loss: " << packet_loss << "%\n";

    return 0;
}