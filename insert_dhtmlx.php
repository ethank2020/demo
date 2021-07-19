<?php
/*
##### 업데이트로그 #####
2021.06.14 봉영근 신규
2021.06.15 김현중 수정 (함수이름 받아서 각각 insert함수 실행)

*/
$data = json_decode(file_get_contents('php://input'), true);
$func_nm = $data['func_nm'];
$output = $func_nm($data);
echo json_encode($output);
?>